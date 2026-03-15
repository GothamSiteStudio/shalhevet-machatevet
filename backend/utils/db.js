/**
 * utils/db.js - שכבת נתונים של PostgreSQL
 * ========================================
 * כל פעולות הקריאה/כתיבה של ה-backend עוברות דרך כאן.
 * המטרה היא לשמור על אותו API פנימי של הקבצים הקיימים,
 * אבל מאחורי הקלעים לעבוד מול PostgreSQL במקום db.json.
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { createPostgresClient, query } = require("./postgres");

const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoString(value) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date(value).toISOString().split("T")[0];
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIntegerOrNull(value) {
  const parsed = toNumberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return Boolean(value);
}

const HABIT_FREQUENCIES = new Set(["daily", "weekly"]);
const CHECK_IN_QUESTION_TYPES = new Set([
  "shortText",
  "longText",
  "number",
  "yesNo",
  "scale",
]);

function normalizeTextList(value) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [
    ...new Set(items.map((item) => String(item || "").trim()).filter(Boolean)),
  ];
}

function normalizeClientTypeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeClientTypeKey(value) {
  return normalizeClientTypeLabel(value).toLowerCase();
}

function normalizeQuickMessageTemplates(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((template, index) => {
      const title = String(template?.title || "").trim();
      const text = String(template?.text || "").trim();

      if (!title && !text) {
        return null;
      }

      return {
        id: template?.id || `quick-message-template-${index + 1}`,
        title: title || `תבנית ${index + 1}`,
        text,
      };
    })
    .filter((template) => template && template.text);
}

function normalizeHabitAssignments(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((habit, index) => {
      const title = String(habit?.title || "").trim();

      return {
        id: habit?.id || `habit-${index + 1}`,
        title: title || `הרגל ${index + 1}`,
        frequency: HABIT_FREQUENCIES.has(habit?.frequency)
          ? habit.frequency
          : "daily",
        targetCount: Math.max(1, toIntegerOrNull(habit?.targetCount) || 1),
        notes: String(habit?.notes || "").trim(),
        isActive: toBoolean(habit?.isActive, true),
      };
    })
    .filter((habit) => habit.title);
}

function normalizeCheckInTemplate(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    title: String(source.title || "").trim(),
    intro: String(source.intro || "").trim(),
    questions: Array.isArray(source.questions)
      ? source.questions
          .map((question, index) => {
            const label = String(question?.label || "").trim();
            const type = CHECK_IN_QUESTION_TYPES.has(question?.type)
              ? question.type
              : "shortText";

            return {
              id: question?.id || `check-in-question-${index + 1}`,
              label: label || `שאלה ${index + 1}`,
              type,
              placeholder: String(question?.placeholder || "").trim(),
              helperText: String(question?.helperText || "").trim(),
              required: toBoolean(question?.required, true),
            };
          })
          .filter((question) => question.label)
      : [],
  };
}

function normalizeCheckInAnswerValue(type, value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (type === "number" || type === "scale") {
    return toNumberOrNull(value);
  }

  if (type === "yesNo") {
    if (typeof value === "boolean") return value;

    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
  }

  const text = String(value || "").trim();
  return text || null;
}

function normalizeCheckInAnswers(value, template) {
  const normalizedTemplate = normalizeCheckInTemplate(template);
  const answersByQuestionId = new Map(
    Array.isArray(value)
      ? value.map((answer) => [String(answer?.questionId || "").trim(), answer])
      : [],
  );

  return normalizedTemplate.questions
    .map((question) => {
      const rawAnswer = answersByQuestionId.get(question.id);
      const normalizedValue = normalizeCheckInAnswerValue(
        question.type,
        rawAnswer?.value,
      );

      if (normalizedValue === null) {
        return null;
      }

      return {
        questionId: question.id,
        label: question.label,
        type: question.type,
        value: normalizedValue,
      };
    })
    .filter(Boolean);
}

function normalizeNutritionTargets(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    calories: toNumberOrNull(source.calories),
    protein: toNumberOrNull(source.protein),
    carbs: toNumberOrNull(source.carbs),
    fat: toNumberOrNull(source.fat),
    waterLiters: toNumberOrNull(source.waterLiters),
  };
}

function normalizeNutritionMeals(value) {
  if (!Array.isArray(value)) return [];

  return value.map((meal, mealIndex) => ({
    id: meal?.id || `meal-${mealIndex + 1}`,
    name: String(meal?.name || "").trim() || `ארוחה ${mealIndex + 1}`,
    time: String(meal?.time || "").trim(),
    notes: String(meal?.notes || "").trim(),
    items: Array.isArray(meal?.items)
      ? meal.items.map((item, itemIndex) => ({
          id: item?.id || `meal-item-${mealIndex + 1}-${itemIndex + 1}`,
          name: String(item?.name || "").trim() || `פריט ${itemIndex + 1}`,
          amount: String(item?.amount || "").trim(),
          imageUrl: String(item?.imageUrl || "").trim(),
          calories: toNumberOrNull(item?.calories) ?? 0,
          protein: toNumberOrNull(item?.protein) ?? 0,
          carbs: toNumberOrNull(item?.carbs) ?? 0,
          fat: toNumberOrNull(item?.fat) ?? 0,
          notes: String(item?.notes || "").trim(),
        }))
      : [],
  }));
}

function normalizeNutritionPlanData(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    title: String(source.title || "").trim(),
    notes: String(source.notes || "").trim(),
    dailyTargets: normalizeNutritionTargets(source.dailyTargets || {}),
    meals: normalizeNutritionMeals(source.meals || []),
  };
}

function normalizeWorkoutTargets(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    workouts: toNumberOrNull(source.workouts),
    cardioMinutes: toNumberOrNull(source.cardioMinutes),
    steps: toNumberOrNull(source.steps),
  };
}

function normalizeWorkoutDays(value) {
  if (!Array.isArray(value)) return [];

  return value.map((day, dayIndex) => ({
    id: day?.id || `day-${dayIndex + 1}`,
    name: String(day?.name || "").trim() || `יום ${dayIndex + 1}`,
    focus: String(day?.focus || "").trim(),
    notes: String(day?.notes || "").trim(),
    exercises: Array.isArray(day?.exercises)
      ? day.exercises.map((exercise, exerciseIndex) => ({
          id:
            exercise?.id ||
            `exercise-${dayIndex + 1}-${exerciseIndex + 1}`,
          order:
            toIntegerOrNull(exercise?.order) ?? exerciseIndex + 1,
          name:
            String(exercise?.name || "").trim() ||
            `תרגיל ${exerciseIndex + 1}`,
          externalExerciseId: String(exercise?.externalExerciseId || "").trim(),
          mediaUrl: String(exercise?.mediaUrl || "").trim(),
          sets: toNumberOrNull(exercise?.sets),
          reps: toNumberOrNull(exercise?.reps),
          restSeconds: toNumberOrNull(exercise?.restSeconds),
          durationSeconds: toNumberOrNull(exercise?.durationSeconds),
          notes: String(exercise?.notes || "").trim(),
        }))
      : [],
  }));
}

function normalizeWorkoutPlanData(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    title: String(source.title || "").trim(),
    goalFocus: String(source.goalFocus || "").trim(),
    notes: String(source.notes || "").trim(),
    weeklyTargets: normalizeWorkoutTargets(source.weeklyTargets || {}),
    days: normalizeWorkoutDays(source.days || []),
  };
}

function hasNutritionPlanContent(plan) {
  if (!plan) return false;

  return Boolean(
    plan.title ||
      plan.notes ||
      (Array.isArray(plan.meals) && plan.meals.length > 0) ||
      Object.values(plan.dailyTargets || {}).some(
        (value) => value !== null && value !== undefined,
      ),
  );
}

function hasWorkoutPlanContent(plan) {
  if (!plan) return false;

  return Boolean(
    plan.title ||
      plan.goalFocus ||
      plan.notes ||
      (Array.isArray(plan.days) && plan.days.length > 0) ||
      Object.values(plan.weeklyTargets || {}).some(
        (value) => value !== null && value !== undefined,
      ),
  );
}

function normalizePlanTemplateProfiles(value) {
  if (!Array.isArray(value)) return [];

  const profilesByType = new Map();

  value.forEach((profile, index) => {
    const typeLabel = normalizeClientTypeLabel(
      profile?.typeLabel || profile?.label || profile?.clientType,
    );

    if (!typeLabel) {
      return;
    }

    const nutritionTemplate = normalizeNutritionPlanData(
      profile?.nutritionTemplate,
    );
    const workoutTemplate = normalizeWorkoutPlanData(profile?.workoutTemplate);

    if (
      !hasNutritionPlanContent(nutritionTemplate) &&
      !hasWorkoutPlanContent(workoutTemplate)
    ) {
      return;
    }

    profilesByType.set(normalizeClientTypeKey(typeLabel), {
      id: profile?.id || `plan-template-profile-${index + 1}`,
      typeKey: normalizeClientTypeKey(typeLabel),
      typeLabel,
      nutritionTemplate: hasNutritionPlanContent(nutritionTemplate)
        ? nutritionTemplate
        : null,
      workoutTemplate: hasWorkoutPlanContent(workoutTemplate)
        ? workoutTemplate
        : null,
      updatedAt: profile?.updatedAt
        ? toIsoString(profile.updatedAt)
        : new Date().toISOString(),
    });
  });

  return Array.from(profilesByType.values());
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    password: row.password,
    role: row.role,
    weight: toNumberOrNull(row.weight),
    height: toNumberOrNull(row.height),
    age: toIntegerOrNull(row.age),
    goal: row.goal || null,
    activityLevel: row.activity_level || null,
    clientType: normalizeClientTypeLabel(row.client_type || ""),
    coachName: row.coach_name || null,
    coachPhone: row.coach_phone || null,
    coachStatus: row.coach_status || "",
    coachTags: normalizeTextList(row.coach_tags || []),
    habitAssignments: normalizeHabitAssignments(row.habit_assignments || []),
    checkInTemplate: normalizeCheckInTemplate(row.check_in_template || {}),
    quickMessageTemplates: normalizeQuickMessageTemplates(
      row.quick_message_templates || [],
    ),
    planTemplateProfiles: normalizePlanTemplateProfiles(
      row.plan_template_profiles || [],
    ),
    isActive: toBoolean(row.is_active, true),
    notes: row.notes || "",
    code: row.code || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapGoals(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    weightGoalKg: toNumberOrNull(row.weight_goal_kg),
    weeklyWorkoutTarget: toIntegerOrNull(row.weekly_workout_target),
    dailyStepsTarget: toIntegerOrNull(row.daily_steps_target),
    dailyWaterTargetLiters: toNumberOrNull(row.daily_water_target_liters),
    calorieTarget: toIntegerOrNull(row.calorie_target),
    proteinTarget: toIntegerOrNull(row.protein_target),
    targetDate: row.target_date || null,
    notes: row.notes || "",
    updatedBy: row.updated_by || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapNutritionPlan(row) {
  if (!row) return null;

  const normalizedPlan = normalizeNutritionPlanData({
    title: row.title,
    notes: row.notes,
    dailyTargets: row.daily_targets || {},
    meals: row.meals || [],
  });

  return {
    id: row.id,
    userId: row.user_id,
    ...normalizedPlan,
    updatedBy: row.updated_by || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapWorkoutPlan(row) {
  if (!row) return null;

  const normalizedPlan = normalizeWorkoutPlanData({
    title: row.title,
    goalFocus: row.goal_focus,
    notes: row.notes,
    weeklyTargets: row.weekly_targets || {},
    days: row.days || [],
  });

  return {
    id: row.id,
    userId: row.user_id,
    ...normalizedPlan,
    updatedBy: row.updated_by || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapWeightEntry(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    weight: toNumberOrNull(row.weight),
    date: toDateOnly(row.entry_date),
    createdAt: toIsoString(row.created_at),
  };
}

function mapUpdate(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    date: toDateOnly(row.update_date),
    createdAt: toIsoString(row.created_at),
    readByCoach: toBoolean(row.read_by_coach, false),
  };
}

function mapMeeting(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    requestedDate: row.requested_date,
    notes: row.notes || "",
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : null,
  };
}

function mapMessage(row) {
  if (!row) return null;

  return {
    id: row.id,
    fromId: row.from_id || null,
    toId: row.to_id || null,
    userId: row.user_id,
    text: row.text,
    fromRole: row.from_role || null,
    read: toBoolean(row.is_read, false),
    createdAt: toIsoString(row.created_at),
  };
}

function mapCheckInEntry(row) {
  if (!row) return null;

  const template = normalizeCheckInTemplate(row.template || {});

  return {
    id: row.id,
    userId: row.user_id,
    weekKey: row.week_key,
    template,
    answers: normalizeCheckInAnswers(row.answers || [], template),
    note: row.note || "",
    submittedAt: toIsoString(row.submitted_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapHabitLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    habitId: row.habit_id,
    date: toDateOnly(row.log_date),
    completed: toBoolean(row.completed, false),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapLog(row) {
  const payload =
    row.payload && typeof row.payload === "object" ? row.payload : {};

  return {
    id: row.id,
    userId: row.user_id || null,
    ...payload,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

const FOOD_DIARY_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];

function createEmptyFoodDiaryMeals() {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  };
}

function mapFoodDiaryItem(item, mealType, index) {
  return {
    id: item?.id || `food-diary-${mealType}-${index + 1}`,
    name: item?.name || "פריט מזון",
    portion: item?.portion || "",
    calories: toNumberOrNull(item?.calories) ?? 0,
    protein: toNumberOrNull(item?.protein) ?? 0,
    carbs: toNumberOrNull(item?.carbs) ?? 0,
    fat: toNumberOrNull(item?.fat) ?? 0,
    source: item?.source || "",
    photoUri: item?.photoUri || "",
  };
}

function normalizeFoodDiaryPayload(payload, fallbackDate) {
  const source =
    payload?.meals && typeof payload.meals === "object"
      ? payload.meals
      : payload && typeof payload === "object"
        ? payload
        : {};

  const meals = FOOD_DIARY_MEAL_TYPES.reduce((accumulator, mealType) => {
    accumulator[mealType] = Array.isArray(source[mealType])
      ? source[mealType].map((item, index) =>
          mapFoodDiaryItem(item, mealType, index),
        )
      : [];
    return accumulator;
  }, createEmptyFoodDiaryMeals());

  const items = FOOD_DIARY_MEAL_TYPES.flatMap((mealType) => meals[mealType]);

  return {
    date:
      toDateOnly(payload?.date || fallbackDate) ||
      new Date().toISOString().split("T")[0],
    meals,
    totals: {
      calories: items.reduce(
        (sum, item) => sum + (toNumberOrNull(item.calories) ?? 0),
        0,
      ),
      protein: items.reduce(
        (sum, item) => sum + (toNumberOrNull(item.protein) ?? 0),
        0,
      ),
      carbs: items.reduce(
        (sum, item) => sum + (toNumberOrNull(item.carbs) ?? 0),
        0,
      ),
      fat: items.reduce(
        (sum, item) => sum + (toNumberOrNull(item.fat) ?? 0),
        0,
      ),
    },
  };
}

function mapFoodDiaryEntry(row) {
  if (!row) return null;

  const normalized = normalizeFoodDiaryPayload(
    row.payload || {},
    row.created_at,
  );

  return {
    id: row.id,
    userId: row.user_id,
    ...normalized,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function ensureCoachUser(client) {
  const coachEmail = (process.env.COACH_EMAIL || "").toLowerCase().trim();
  const coachPassword = process.env.COACH_PASSWORD || "";

  if (!coachEmail || !coachPassword) {
    return;
  }

  const existingCoach = await client.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [coachEmail],
  );

  if (existingCoach.rowCount > 0) {
    return;
  }

  const hashedPassword = await bcrypt.hash(coachPassword, 10);

  await client.query(
    `
      INSERT INTO users (
        id, name, email, phone, password, role, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'coach', NOW(), NOW())
    `,
    [
      "coach-shalhevet",
      process.env.COACH_NAME || "שלהבת מחטבת",
      coachEmail,
      process.env.COACH_PHONE || "",
      hashedPassword,
    ],
  );
}

async function readDB() {
  const [
    usersResult,
    weightHistoryResult,
    workoutLogsResult,
    nutritionLogsResult,
    updatesResult,
    meetingsResult,
    messagesResult,
    goalsResult,
    nutritionPlansResult,
    workoutPlansResult,
  ] = await Promise.all([
    query("SELECT * FROM users ORDER BY created_at DESC"),
    query(
      "SELECT * FROM weight_history ORDER BY entry_date ASC, created_at ASC",
    ),
    query("SELECT * FROM workout_logs ORDER BY created_at DESC"),
    query("SELECT * FROM nutrition_logs ORDER BY created_at DESC"),
    query("SELECT * FROM updates ORDER BY created_at DESC"),
    query("SELECT * FROM meetings ORDER BY created_at DESC"),
    query("SELECT * FROM messages ORDER BY created_at DESC"),
    query("SELECT * FROM client_goals ORDER BY created_at DESC"),
    query("SELECT * FROM nutrition_plans ORDER BY created_at DESC"),
    query("SELECT * FROM workout_plans ORDER BY created_at DESC"),
  ]);

  return {
    users: usersResult.rows.map(mapUser),
    weightHistory: weightHistoryResult.rows.map(mapWeightEntry),
    workoutLogs: workoutLogsResult.rows.map(mapLog),
    nutritionLogs: nutritionLogsResult.rows.map(mapLog),
    updates: updatesResult.rows.map(mapUpdate),
    meetings: meetingsResult.rows.map(mapMeeting),
    messages: messagesResult.rows.map(mapMessage),
    clientGoals: goalsResult.rows.map(mapGoals),
    nutritionPlans: nutritionPlansResult.rows.map(mapNutritionPlan),
    workoutPlans: workoutPlansResult.rows.map(mapWorkoutPlan),
  };
}

async function writeDB() {
  throw new Error(
    "writeDB אינו נתמך יותר במצב PostgreSQL. השתמשי בפונקציות הייעודיות של utils/db.js",
  );
}

async function initDB() {
  const client = createPostgresClient();

  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");
    await client.connect();
    await client.query(schemaSql);
    await ensureCoachUser(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function getAllUsers() {
  const result = await query("SELECT * FROM users ORDER BY created_at DESC");
  return result.rows.map(mapUser);
}

async function getUserById(id) {
  const result = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return mapUser(result.rows[0]);
}

async function getUserByEmail(email) {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  if (!normalizedEmail) return null;

  const result = await query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
    normalizedEmail,
  ]);
  return mapUser(result.rows[0]);
}

async function createUser(userData) {
  const now = new Date().toISOString();
  const result = await query(
    `
      INSERT INTO users (
        id, name, email, phone, password, role,
        weight, height, age, goal, activity_level,
        coach_name, coach_phone, coach_status, coach_tags,
        habit_assignments, check_in_template,
        is_active, notes, code, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15::jsonb,
        $16::jsonb, $17::jsonb,
        $18, $19, $20, $21, $22
      )
      RETURNING *
    `,
    [
      userData.id,
      userData.name,
      String(userData.email || "")
        .toLowerCase()
        .trim(),
      userData.phone || "",
      userData.password,
      userData.role,
      toNumberOrNull(userData.weight),
      toNumberOrNull(userData.height),
      toIntegerOrNull(userData.age),
      userData.goal || null,
      userData.activityLevel || null,
      userData.coachName || null,
      userData.coachPhone || null,
      userData.coachStatus || "",
      JSON.stringify(normalizeTextList(userData.coachTags || [])),
      JSON.stringify(
        normalizeHabitAssignments(userData.habitAssignments || []),
      ),
      JSON.stringify(normalizeCheckInTemplate(userData.checkInTemplate || {})),
      toBoolean(userData.isActive, true),
      userData.notes || "",
      userData.code || null,
      userData.createdAt ? toIsoString(userData.createdAt) : now,
      userData.updatedAt ? toIsoString(userData.updatedAt) : now,
    ],
  );

  return mapUser(result.rows[0]);
}

async function updateUser(id, updates) {
  const fieldMap = {
    name: { column: "name" },
    email: {
      column: "email",
      transform: (value) =>
        String(value || "")
          .toLowerCase()
          .trim(),
    },
    phone: { column: "phone" },
    password: { column: "password" },
    role: { column: "role" },
    weight: { column: "weight", transform: toNumberOrNull },
    height: { column: "height", transform: toNumberOrNull },
    age: { column: "age", transform: toIntegerOrNull },
    goal: { column: "goal" },
    activityLevel: { column: "activity_level" },
    clientType: {
      column: "client_type",
      transform: normalizeClientTypeLabel,
    },
    coachName: { column: "coach_name" },
    coachPhone: { column: "coach_phone" },
    coachStatus: { column: "coach_status" },
    coachTags: {
      column: "coach_tags",
      cast: "jsonb",
      transform: (value) => JSON.stringify(normalizeTextList(value)),
    },
    habitAssignments: {
      column: "habit_assignments",
      cast: "jsonb",
      transform: (value) => JSON.stringify(normalizeHabitAssignments(value)),
    },
    checkInTemplate: {
      column: "check_in_template",
      cast: "jsonb",
      transform: (value) => JSON.stringify(normalizeCheckInTemplate(value)),
    },
    quickMessageTemplates: {
      column: "quick_message_templates",
      cast: "jsonb",
      transform: (value) =>
        JSON.stringify(normalizeQuickMessageTemplates(value)),
    },
    planTemplateProfiles: {
      column: "plan_template_profiles",
      cast: "jsonb",
      transform: (value) =>
        JSON.stringify(normalizePlanTemplateProfiles(value)),
    },
    isActive: {
      column: "is_active",
      transform: (value) => toBoolean(value, true),
    },
    notes: { column: "notes" },
    code: { column: "code" },
  };

  const setClauses = [];
  const values = [];

  Object.entries(updates || {}).forEach(([key, rawValue]) => {
    if (rawValue === undefined || !fieldMap[key]) return;

    const descriptor = fieldMap[key];
    const value = descriptor.transform
      ? descriptor.transform(rawValue)
      : rawValue;
    values.push(value);
    setClauses.push(
      `${descriptor.column} = $${values.length}${descriptor.cast === "jsonb" ? "::jsonb" : ""}`,
    );
  });

  if (setClauses.length === 0) {
    return getUserById(id);
  }

  values.push(id);

  const result = await query(
    `
      UPDATE users
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `,
    values,
  );

  return mapUser(result.rows[0]);
}

async function getClientGoals(userId) {
  const result = await query(
    "SELECT * FROM client_goals WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  return mapGoals(result.rows[0]);
}

async function upsertClientGoals(userId, goalsData) {
  const existing = await getClientGoals(userId);
  const now = new Date().toISOString();
  const nextGoals = {
    ...existing,
    ...goalsData,
    id: existing?.id || createRecordId("goal"),
    userId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const result = await query(
    `
      INSERT INTO client_goals (
        id, user_id, weight_goal_kg, weekly_workout_target,
        daily_steps_target, daily_water_target_liters,
        calorie_target, protein_target, target_date,
        notes, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        weight_goal_kg = EXCLUDED.weight_goal_kg,
        weekly_workout_target = EXCLUDED.weekly_workout_target,
        daily_steps_target = EXCLUDED.daily_steps_target,
        daily_water_target_liters = EXCLUDED.daily_water_target_liters,
        calorie_target = EXCLUDED.calorie_target,
        protein_target = EXCLUDED.protein_target,
        target_date = EXCLUDED.target_date,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      nextGoals.id,
      userId,
      toNumberOrNull(nextGoals.weightGoalKg),
      toIntegerOrNull(nextGoals.weeklyWorkoutTarget),
      toIntegerOrNull(nextGoals.dailyStepsTarget),
      toNumberOrNull(nextGoals.dailyWaterTargetLiters),
      toIntegerOrNull(nextGoals.calorieTarget),
      toIntegerOrNull(nextGoals.proteinTarget),
      nextGoals.targetDate || null,
      nextGoals.notes || "",
      nextGoals.updatedBy || null,
      toIsoString(nextGoals.createdAt),
      toIsoString(nextGoals.updatedAt),
    ],
  );

  return mapGoals(result.rows[0]);
}

async function getNutritionPlan(userId) {
  const result = await query(
    "SELECT * FROM nutrition_plans WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  return mapNutritionPlan(result.rows[0]);
}

async function upsertNutritionPlan(userId, planData) {
  const existing = await getNutritionPlan(userId);
  const now = new Date().toISOString();
  const nextPlan = {
    ...existing,
    ...planData,
    id: existing?.id || createRecordId("nutrition-plan"),
    userId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const result = await query(
    `
      INSERT INTO nutrition_plans (
        id, user_id, title, notes, daily_targets, meals,
        updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        title = EXCLUDED.title,
        notes = EXCLUDED.notes,
        daily_targets = EXCLUDED.daily_targets,
        meals = EXCLUDED.meals,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      nextPlan.id,
      userId,
      nextPlan.title || null,
      nextPlan.notes || "",
      JSON.stringify(nextPlan.dailyTargets || {}),
      JSON.stringify(nextPlan.meals || []),
      nextPlan.updatedBy || null,
      toIsoString(nextPlan.createdAt),
      toIsoString(nextPlan.updatedAt),
    ],
  );

  return mapNutritionPlan(result.rows[0]);
}

async function getWorkoutPlan(userId) {
  const result = await query(
    "SELECT * FROM workout_plans WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  return mapWorkoutPlan(result.rows[0]);
}

async function upsertWorkoutPlan(userId, planData) {
  const existing = await getWorkoutPlan(userId);
  const now = new Date().toISOString();
  const nextPlan = {
    ...existing,
    ...planData,
    id: existing?.id || createRecordId("workout-plan"),
    userId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const result = await query(
    `
      INSERT INTO workout_plans (
        id, user_id, title, goal_focus, notes, weekly_targets, days,
        updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        title = EXCLUDED.title,
        goal_focus = EXCLUDED.goal_focus,
        notes = EXCLUDED.notes,
        weekly_targets = EXCLUDED.weekly_targets,
        days = EXCLUDED.days,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      nextPlan.id,
      userId,
      nextPlan.title || null,
      nextPlan.goalFocus || "",
      nextPlan.notes || "",
      JSON.stringify(nextPlan.weeklyTargets || {}),
      JSON.stringify(nextPlan.days || []),
      nextPlan.updatedBy || null,
      toIsoString(nextPlan.createdAt),
      toIsoString(nextPlan.updatedAt),
    ],
  );

  return mapWorkoutPlan(result.rows[0]);
}

async function getWeightHistory(userId) {
  const result = await query(
    `
      SELECT *
      FROM weight_history
      WHERE user_id = $1
      ORDER BY entry_date ASC, created_at ASC
    `,
    [userId],
  );

  return result.rows.map(mapWeightEntry);
}

async function addWeightEntry(userId, weight) {
  const today = new Date().toISOString().split("T")[0];

  const result = await query(
    `
      INSERT INTO weight_history (id, user_id, weight, entry_date, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, entry_date) DO UPDATE SET
        weight = EXCLUDED.weight,
        created_at = NOW()
      RETURNING *
    `,
    [createRecordId("weight"), userId, toNumberOrNull(weight), today],
  );

  return mapWeightEntry(result.rows[0]);
}

async function getUpdates(userId) {
  const result = await query(
    `
      SELECT *
      FROM updates
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapUpdate);
}

async function getAllUpdates() {
  const result = await query("SELECT * FROM updates ORDER BY created_at DESC");
  return result.rows.map(mapUpdate);
}

async function addUpdate(userId, text) {
  const result = await query(
    `
      INSERT INTO updates (id, user_id, text, update_date, read_by_coach, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `,
    [
      createRecordId("update"),
      userId,
      text,
      new Date().toISOString().split("T")[0],
    ],
  );

  return mapUpdate(result.rows[0]);
}

async function getMeetings(userId) {
  const result = await query(
    `
      SELECT *
      FROM meetings
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapMeeting);
}

async function getAllMeetings() {
  const result = await query("SELECT * FROM meetings ORDER BY created_at DESC");
  return result.rows.map(mapMeeting);
}

async function addMeeting(userId, date, notes) {
  const result = await query(
    `
      INSERT INTO meetings (id, user_id, requested_date, notes, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `,
    [createRecordId("meeting"), userId, date, notes || "", "ממתין לאישור"],
  );

  return mapMeeting(result.rows[0]);
}

async function updateMeetingStatus(meetingId, status) {
  const result = await query(
    `
      UPDATE meetings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [status, meetingId],
  );

  return mapMeeting(result.rows[0]);
}

async function getMessages(userId) {
  const result = await query(
    `
      SELECT *
      FROM messages
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId],
  );

  return result.rows.map(mapMessage);
}

async function getAllMessages() {
  const result = await query("SELECT * FROM messages ORDER BY created_at DESC");
  return result.rows.map(mapMessage);
}

async function addMessage(fromId, toId, text, fromRole) {
  const clientUserId = fromRole === "coach" ? toId : fromId;

  const result = await query(
    `
      INSERT INTO messages (id, from_id, to_id, user_id, text, from_role, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING *
    `,
    [createRecordId("message"), fromId, toId, clientUserId, text, fromRole],
  );

  return mapMessage(result.rows[0]);
}

async function getFoodDiaryEntry(userId, date) {
  const normalizedDate =
    toDateOnly(date) || new Date().toISOString().split("T")[0];
  const result = await query(
    `
      SELECT *
      FROM nutrition_logs
      WHERE user_id = $1
        AND payload->>'type' = 'food-diary'
        AND payload->>'date' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, normalizedDate],
  );

  return (
    mapFoodDiaryEntry(result.rows[0]) || {
      id: null,
      userId,
      date: normalizedDate,
      meals: createEmptyFoodDiaryMeals(),
      totals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      createdAt: null,
      updatedAt: null,
    }
  );
}

async function listFoodDiaryEntries(userId, limit = 7) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 7, 31));
  const result = await query(
    `
      SELECT *
      FROM nutrition_logs
      WHERE user_id = $1
        AND payload->>'type' = 'food-diary'
      ORDER BY COALESCE(payload->>'date', '') DESC, created_at DESC
      LIMIT $2
    `,
    [userId, safeLimit],
  );

  return result.rows.map(mapFoodDiaryEntry);
}

async function saveFoodDiaryEntry(userId, date, entryData) {
  const normalizedDate =
    toDateOnly(date) || new Date().toISOString().split("T")[0];
  const normalizedEntry = normalizeFoodDiaryPayload(
    entryData || {},
    normalizedDate,
  );
  const payload = {
    type: "food-diary",
    date: normalizedDate,
    meals: normalizedEntry.meals,
    totals: normalizedEntry.totals,
  };

  const existing = await query(
    `
      SELECT id
      FROM nutrition_logs
      WHERE user_id = $1
        AND payload->>'type' = 'food-diary'
        AND payload->>'date' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, normalizedDate],
  );

  if (existing.rowCount > 0) {
    const result = await query(
      `
        UPDATE nutrition_logs
        SET payload = $1::jsonb, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [JSON.stringify(payload), existing.rows[0].id],
    );

    return mapFoodDiaryEntry(result.rows[0]);
  }

  const result = await query(
    `
      INSERT INTO nutrition_logs (id, user_id, payload, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [createRecordId("nutrition-log"), userId, JSON.stringify(payload)],
  );

  return mapFoodDiaryEntry(result.rows[0]);
}

function mergeHabitAssignmentsWithLogs(habitAssignments, logs) {
  const logsByHabitId = new Map(
    (logs || []).map((log) => [String(log.habitId || "").trim(), log]),
  );

  return normalizeHabitAssignments(habitAssignments).map((habit) => {
    const log = logsByHabitId.get(habit.id);

    return {
      ...habit,
      completed: log?.completed || false,
      completedAt: log?.updatedAt || null,
      logId: log?.id || null,
    };
  });
}

async function getCheckInEntry(userId, weekKey) {
  const result = await query(
    "SELECT * FROM check_in_entries WHERE user_id = $1 AND week_key = $2 LIMIT 1",
    [userId, weekKey],
  );

  return mapCheckInEntry(result.rows[0]);
}

async function getLatestCheckInEntry(userId) {
  const result = await query(
    `
      SELECT *
      FROM check_in_entries
      WHERE user_id = $1
      ORDER BY submitted_at DESC, updated_at DESC
      LIMIT 1
    `,
    [userId],
  );

  return mapCheckInEntry(result.rows[0]);
}

async function upsertCheckInEntry(userId, weekKey, entryData = {}) {
  const existing = await getCheckInEntry(userId, weekKey);
  const now = new Date().toISOString();
  const template = normalizeCheckInTemplate(entryData.template || {});
  const answers = normalizeCheckInAnswers(entryData.answers || [], template);

  const result = await query(
    `
      INSERT INTO check_in_entries (
        id, user_id, week_key, template, answers, note,
        submitted_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9)
      ON CONFLICT (user_id, week_key) DO UPDATE SET
        template = EXCLUDED.template,
        answers = EXCLUDED.answers,
        note = EXCLUDED.note,
        submitted_at = EXCLUDED.submitted_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      existing?.id || createRecordId("check-in"),
      userId,
      weekKey,
      JSON.stringify(template),
      JSON.stringify(answers),
      String(entryData.note || "").trim(),
      now,
      existing?.createdAt ? toIsoString(existing.createdAt) : now,
      now,
    ],
  );

  return mapCheckInEntry(result.rows[0]);
}

async function getHabitLogsForDate(userId, logDate) {
  const normalizedDate = toDateOnly(logDate);
  const result = await query(
    `
      SELECT *
      FROM habit_logs
      WHERE user_id = $1 AND log_date = $2
      ORDER BY created_at DESC
    `,
    [userId, normalizedDate],
  );

  return result.rows.map(mapHabitLog);
}

async function getHabitAssignmentsWithLogs(userId, logDate) {
  const normalizedDate = toDateOnly(logDate);
  const [user, logs] = await Promise.all([
    getUserById(userId),
    getHabitLogsForDate(userId, normalizedDate),
  ]);

  return {
    date: normalizedDate,
    habits: mergeHabitAssignmentsWithLogs(user?.habitAssignments || [], logs),
  };
}

async function saveHabitLog(userId, habitId, logDate, completed) {
  const normalizedDate = toDateOnly(logDate);
  const existingLogs = await getHabitLogsForDate(userId, normalizedDate);
  const existing = existingLogs.find((log) => log.habitId === habitId);
  const now = new Date().toISOString();

  const result = await query(
    `
      INSERT INTO habit_logs (
        id, user_id, habit_id, log_date, completed, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, habit_id, log_date) DO UPDATE SET
        completed = EXCLUDED.completed,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `,
    [
      existing?.id || createRecordId("habit-log"),
      userId,
      habitId,
      normalizedDate,
      toBoolean(completed, false),
      existing?.createdAt ? toIsoString(existing.createdAt) : now,
      now,
    ],
  );

  return mapHabitLog(result.rows[0]);
}

function createEmptyClientEngagementOverview() {
  return {
    unreadUpdatesCount: 0,
    pendingMeetingsCount: 0,
    lastUpdateAt: null,
    lastMeetingAt: null,
    lastClientMessageAt: null,
    lastCoachMessageAt: null,
    lastCheckInAt: null,
    lastHabitLogAt: null,
    lastWeightEntryAt: null,
  };
}

function buildUserIdPlaceholders(userIds) {
  return userIds.map((_, index) => `$${index + 1}`).join(", ");
}

async function getClientEngagementOverview(userIds = []) {
  const normalizedUserIds = [
    ...new Set(
      (Array.isArray(userIds) ? userIds : [userIds])
        .map((userId) => String(userId || "").trim())
        .filter(Boolean),
    ),
  ];

  if (normalizedUserIds.length === 0) {
    return {};
  }

  const placeholders = buildUserIdPlaceholders(normalizedUserIds);
  const baseOverview = Object.fromEntries(
    normalizedUserIds.map((userId) => [
      userId,
      createEmptyClientEngagementOverview(),
    ]),
  );

  const [
    updatesResult,
    meetingsResult,
    messagesResult,
    checkInsResult,
    habitLogsResult,
    weightResult,
  ] = await Promise.all([
    query(
      `
          SELECT
            user_id,
            COUNT(*) FILTER (WHERE read_by_coach = false)::int AS unread_updates_count,
            MAX(created_at) AS last_update_at
          FROM updates
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
    query(
      `
          SELECT
            user_id,
            COUNT(*) FILTER (WHERE status = 'ממתין לאישור')::int AS pending_meetings_count,
            MAX(created_at) AS last_meeting_at
          FROM meetings
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
    query(
      `
          SELECT
            user_id,
            MAX(created_at) FILTER (WHERE from_role = 'client') AS last_client_message_at,
            MAX(created_at) FILTER (WHERE from_role = 'coach') AS last_coach_message_at
          FROM messages
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
    query(
      `
          SELECT user_id, MAX(submitted_at) AS last_check_in_at
          FROM check_in_entries
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
    query(
      `
          SELECT user_id, MAX(updated_at) AS last_habit_log_at
          FROM habit_logs
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
    query(
      `
          SELECT user_id, MAX(created_at) AS last_weight_entry_at
          FROM weight_history
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        `,
      normalizedUserIds,
    ),
  ]);

  updatesResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.unreadUpdatesCount = Number(row.unread_updates_count) || 0;
    current.lastUpdateAt = row.last_update_at
      ? toIsoString(row.last_update_at)
      : null;
  });

  meetingsResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.pendingMeetingsCount = Number(row.pending_meetings_count) || 0;
    current.lastMeetingAt = row.last_meeting_at
      ? toIsoString(row.last_meeting_at)
      : null;
  });

  messagesResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.lastClientMessageAt = row.last_client_message_at
      ? toIsoString(row.last_client_message_at)
      : null;
    current.lastCoachMessageAt = row.last_coach_message_at
      ? toIsoString(row.last_coach_message_at)
      : null;
  });

  checkInsResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.lastCheckInAt = row.last_check_in_at
      ? toIsoString(row.last_check_in_at)
      : null;
  });

  habitLogsResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.lastHabitLogAt = row.last_habit_log_at
      ? toIsoString(row.last_habit_log_at)
      : null;
  });

  weightResult.rows.forEach((row) => {
    const current = baseOverview[row.user_id];
    if (!current) return;

    current.lastWeightEntryAt = row.last_weight_entry_at
      ? toIsoString(row.last_weight_entry_at)
      : null;
  });

  return baseOverview;
}

// ─── Coach Meals (מאגר ארוחות של המאמנת) ────────────────────────────────────

function mapCoachMeal(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    category: row.category || "כללי",
    description: row.description || "",
    imageUrl: row.image_url || "",
    calories: toIntegerOrNull(row.calories),
    protein: toNumberOrNull(row.protein),
    carbs: toNumberOrNull(row.carbs),
    fat: toNumberOrNull(row.fat),
    servings: toIntegerOrNull(row.servings) || 1,
    portion: row.portion || "",
    ingredients: row.ingredients || [],
    instructions: row.instructions || [],
    items: row.items || [],
    createdBy: row.created_by || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function getAllCoachMeals() {
  const result = await query(
    "SELECT * FROM coach_meals ORDER BY category ASC, title ASC",
  );
  return result.rows.map(mapCoachMeal);
}

async function getCoachMealById(id) {
  const result = await query(
    "SELECT * FROM coach_meals WHERE id = $1 LIMIT 1",
    [id],
  );
  return mapCoachMeal(result.rows[0]);
}

async function createCoachMeal(data) {
  const result = await query(
    `
      INSERT INTO coach_meals (
        id, title, category, description, image_url,
        calories, protein, carbs, fat,
        servings, portion, ingredients, instructions, items,
        created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15, NOW(), NOW())
      RETURNING *
    `,
    [
      createRecordId("coach-meal"),
      data.title,
      data.category || "כללי",
      data.description || "",
      data.imageUrl || "",
      toIntegerOrNull(data.calories),
      toNumberOrNull(data.protein),
      toNumberOrNull(data.carbs),
      toNumberOrNull(data.fat),
      toIntegerOrNull(data.servings) || 1,
      data.portion || "",
      JSON.stringify(data.ingredients || []),
      JSON.stringify(data.instructions || []),
      JSON.stringify(data.items || []),
      data.createdBy || null,
    ],
  );

  return mapCoachMeal(result.rows[0]);
}

async function updateCoachMeal(id, data) {
  const setClauses = [];
  const values = [];

  const fieldMap = {
    title: "title",
    category: "category",
    description: "description",
    imageUrl: "image_url",
    calories: "calories",
    protein: "protein",
    carbs: "carbs",
    fat: "fat",
    servings: "servings",
    portion: "portion",
  };

  Object.entries(fieldMap).forEach(([key, column]) => {
    if (data[key] !== undefined) {
      values.push(data[key]);
      setClauses.push(`${column} = $${values.length}`);
    }
  });

  if (data.ingredients !== undefined) {
    values.push(JSON.stringify(data.ingredients));
    setClauses.push(`ingredients = $${values.length}::jsonb`);
  }

  if (data.instructions !== undefined) {
    values.push(JSON.stringify(data.instructions));
    setClauses.push(`instructions = $${values.length}::jsonb`);
  }

  if (data.items !== undefined) {
    values.push(JSON.stringify(data.items));
    setClauses.push(`items = $${values.length}::jsonb`);
  }

  if (setClauses.length === 0) {
    return getCoachMealById(id);
  }

  values.push(id);

  const result = await query(
    `
      UPDATE coach_meals
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `,
    values,
  );

  return mapCoachMeal(result.rows[0]);
}

async function deleteCoachMeal(id) {
  const result = await query(
    "DELETE FROM coach_meals WHERE id = $1 RETURNING *",
    [id],
  );
  return mapCoachMeal(result.rows[0]);
}

module.exports = {
  readDB,
  writeDB,
  initDB,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getClientGoals,
  upsertClientGoals,
  getNutritionPlan,
  upsertNutritionPlan,
  getWorkoutPlan,
  upsertWorkoutPlan,
  getWeightHistory,
  addWeightEntry,
  getUpdates,
  getAllUpdates,
  addUpdate,
  getMeetings,
  getAllMeetings,
  addMeeting,
  updateMeetingStatus,
  getMessages,
  getAllMessages,
  addMessage,
  getFoodDiaryEntry,
  listFoodDiaryEntries,
  saveFoodDiaryEntry,
  getCheckInEntry,
  getLatestCheckInEntry,
  upsertCheckInEntry,
  getHabitLogsForDate,
  getHabitAssignmentsWithLogs,
  saveHabitLog,
  getClientEngagementOverview,
  getAllCoachMeals,
  getCoachMealById,
  createCoachMeal,
  updateCoachMeal,
  deleteCoachMeal,
};
