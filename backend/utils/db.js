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
    coachName: row.coach_name || null,
    coachPhone: row.coach_phone || null,
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

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || null,
    notes: row.notes || "",
    dailyTargets: row.daily_targets || {},
    meals: row.meals || [],
    updatedBy: row.updated_by || null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapWorkoutPlan(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || null,
    goalFocus: row.goal_focus || "",
    notes: row.notes || "",
    weeklyTargets: row.weekly_targets || {},
    days: row.days || [],
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
        coach_name, coach_phone, is_active, notes, code,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18
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
    coachName: { column: "coach_name" },
    coachPhone: { column: "coach_phone" },
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
    setClauses.push(`${descriptor.column} = $${values.length}`);
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
  getAllCoachMeals,
  getCoachMealById,
  createCoachMeal,
  updateCoachMeal,
  deleteCoachMeal,
};
