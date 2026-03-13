/**
 * routes/coach.js - לוח בקרה של המאמנת שלהבת
 * ===============================================
 * GET  /api/coach/clients         - כל הלקוחות
 * GET  /api/coach/clients/:id     - פרטי לקוחה ספציפית
 * PUT  /api/coach/clients/:id     - עדכון פרטי לקוחה
 * POST /api/coach/clients         - הוספת לקוחה ידנית
 * GET  /api/coach/updates         - כל העדכונים מהלקוחות
 * GET  /api/coach/meetings        - כל בקשות הפגישות
 * PUT  /api/coach/meetings/:id    - אישור/דחיית פגישה
 * GET  /api/coach/messages        - כל ההודעות
 * POST /api/coach/messages/:userId - שלח הודעה ללקוחה
 * GET  /api/coach/stats           - סטטיסטיקות כלליות
 * GET  /api/coach/meals           - מאגר ארוחות של המאמנת
 * GET  /api/coach/meals/:id       - ארוחה ספציפית מהמאגר
 * POST /api/coach/meals           - הוספת ארוחה למאגר
 * PUT  /api/coach/meals/:id       - עדכון ארוחה במאגר
 * DELETE /api/coach/meals/:id     - מחיקת ארוחה מהמאגר
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getClientGoals,
  getFoodDiaryEntry,
  upsertClientGoals,
  getNutritionPlan,
  upsertNutritionPlan,
  getWorkoutPlan,
  upsertWorkoutPlan,
  getWeightHistory,
  getUpdates,
  getMeetings,
  getMessages,
  getAllUpdates,
  getAllMeetings,
  updateMeetingStatus,
  getAllMessages,
  addMessage,
  listFoodDiaryEntries,
  saveFoodDiaryEntry,
    getLatestCheckInEntry,
  getAllCoachMeals,
  getCoachMealById,
  createCoachMeal,
  updateCoachMeal,
  deleteCoachMeal,
} = require("../utils/db");
const { authenticate, requireCoach } = require("../middleware/auth");

// כל ה-routes דורשים כניסה וזכות מאמנת
router.use(authenticate);
router.use(requireCoach);

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const FOOD_DIARY_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const HABIT_FREQUENCIES = new Set(["daily", "weekly"]);
const CHECK_IN_QUESTION_TYPES = new Set([
  "shortText",
  "longText",
  "number",
  "yesNo",
  "scale",
]);

function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function createBadRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

async function getClientOrNull(userId) {
  const user = await getUserById(userId);
  return user && user.role === "client" ? user : null;
}

function parseOptionalNumber(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createBadRequest(`השדה ${fieldName} חייב להיות מספרי`);
  }

  return parsed;
}

function parseOptionalInteger(value, fieldName) {
  const parsed = parseOptionalNumber(value, fieldName);
  if (parsed === undefined || parsed === null) return parsed;
  return Math.trunc(parsed);
}

function parseOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value).trim();
}

function parseOptionalEmail(value) {
  if (value === undefined) return undefined;

  const email = String(value || "")
    .toLowerCase()
    .trim();

  if (!email) {
    throw createBadRequest("נא למלא אימייל תקין");
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) {
    throw createBadRequest("נא למלא אימייל תקין");
  }

  return email;
}

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw createBadRequest(`השדה ${fieldName} חייב להיות true או false`);
}

function parseOptionalHttpUrl(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return "";

  const url = String(value).trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("invalid protocol");
    }

    return parsed.toString();
  } catch {
    throw createBadRequest(`השדה ${fieldName} חייב להיות קישור תקין`);
  }
}

function ensureArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw createBadRequest(`השדה ${fieldName} חייב להיות מערך`);
  }

  return value;
}

function buildGoalsPayload(body) {
  const payload = {};

  [
    "weightGoalKg",
    "weeklyWorkoutTarget",
    "dailyStepsTarget",
    "dailyWaterTargetLiters",
    "calorieTarget",
    "proteinTarget",
  ].forEach((field) => {
    const parsed = parseOptionalNumber(body[field], field);
    if (parsed !== undefined) payload[field] = parsed;
  });

  ["targetDate", "notes"].forEach((field) => {
    const text = parseOptionalText(body[field]);
    if (text !== undefined) payload[field] = text;
  });

  return payload;
}

function buildNutritionTargets(targets = {}) {
  const payload = {};

  ["calories", "protein", "carbs", "fat", "waterLiters"].forEach((field) => {
    const parsed = parseOptionalNumber(targets[field], `dailyTargets.${field}`);
    if (parsed !== undefined) payload[field] = parsed;
  });

  return payload;
}

function parseOptionalTags(value) {
  if (value === undefined) return undefined;

  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;

  if (!items) {
    throw createBadRequest("השדה coachTags חייב להיות רשימה או טקסט מופרד בפסיקים");
  }

  return [...new Set(
    items
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )];
}

function buildHabitAssignmentsPayload(value) {
  if (value === undefined) return undefined;

  return ensureArray(value, "habitAssignments").map((habit, index) => {
    const title = parseOptionalText(habit?.title) || "";
    if (!title) {
      throw createBadRequest(`חסר שם להרגל מספר ${index + 1}`);
    }

    const frequency = parseOptionalText(habit?.frequency) || "daily";
    if (!HABIT_FREQUENCIES.has(frequency)) {
      throw createBadRequest(`התדירות של הרגל ${index + 1} חייבת להיות daily או weekly`);
    }

    return {
      id: parseOptionalText(habit?.id) || `habit-${index + 1}`,
      title,
      frequency,
      targetCount: parseOptionalInteger(habit?.targetCount, `habitAssignments[${index}].targetCount`) || 1,
      notes: parseOptionalText(habit?.notes) || "",
      isActive: parseOptionalBoolean(habit?.isActive, `habitAssignments[${index}].isActive`) ?? true,
    };
  });
}

function buildCheckInTemplatePayload(value) {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createBadRequest("השדה checkInTemplate חייב להיות אובייקט");
  }

  const questions = ensureArray(value.questions || [], "checkInTemplate.questions").map(
    (question, index) => {
      const label = parseOptionalText(question?.label) || "";
      if (!label) {
        throw createBadRequest(`חסרה כותרת לשאלת צ׳ק-אין מספר ${index + 1}`);
      }

      const type = parseOptionalText(question?.type) || "shortText";
      if (!CHECK_IN_QUESTION_TYPES.has(type)) {
        throw createBadRequest(`סוג השאלה ${label} אינו נתמך`);
      }

      return {
        id: parseOptionalText(question?.id) || `check-in-question-${index + 1}`,
        label,
        type,
        placeholder: parseOptionalText(question?.placeholder) || "",
        helperText: parseOptionalText(question?.helperText) || "",
        required:
          parseOptionalBoolean(
            question?.required,
            `checkInTemplate.questions[${index}].required`,
          ) ?? true,
      };
    },
  );

  return {
    title: parseOptionalText(value.title) || "",
    intro: parseOptionalText(value.intro) || "",
    questions,
  };
}

function buildMealItems(items, mealIndex) {
  return ensureArray(items, `meals[${mealIndex}].items`).map(
    (item, itemIndex) => {
      const name = parseOptionalText(item?.name) || "";
      if (!name) {
        throw createBadRequest(`חסר שם לפריט בארוחה מספר ${mealIndex + 1}`);
      }

      return {
        id: item?.id || `meal-item-${mealIndex + 1}-${itemIndex + 1}`,
        name,
        amount: parseOptionalText(item?.amount) || "",
        imageUrl:
          parseOptionalHttpUrl(
            item?.imageUrl,
            `meals[${mealIndex}].items[${itemIndex}].imageUrl`,
          ) || "",
        calories:
          parseOptionalNumber(
            item?.calories,
            `meals[${mealIndex}].items[${itemIndex}].calories`,
          ) ?? 0,
        protein:
          parseOptionalNumber(
            item?.protein,
            `meals[${mealIndex}].items[${itemIndex}].protein`,
          ) ?? 0,
        carbs:
          parseOptionalNumber(
            item?.carbs,
            `meals[${mealIndex}].items[${itemIndex}].carbs`,
          ) ?? 0,
        fat:
          parseOptionalNumber(
            item?.fat,
            `meals[${mealIndex}].items[${itemIndex}].fat`,
          ) ?? 0,
        notes: parseOptionalText(item?.notes) || "",
      };
    },
  );
}

function buildNutritionMeals(meals) {
  return ensureArray(meals, "meals").map((meal, mealIndex) => {
    const name = parseOptionalText(meal?.name) || "";
    if (!name) {
      throw createBadRequest(`חסר שם לארוחה מספר ${mealIndex + 1}`);
    }

    return {
      id: meal?.id || `meal-${mealIndex + 1}`,
      name,
      time: parseOptionalText(meal?.time) || "",
      notes: parseOptionalText(meal?.notes) || "",
      items: buildMealItems(meal?.items || [], mealIndex),
    };
  });
}

function buildNutritionPlanPayload(body) {
  const payload = {};

  if ("title" in body)
    payload.title = parseOptionalText(body.title) || "תפריט אישי";
  if ("notes" in body) payload.notes = parseOptionalText(body.notes) || "";
  if ("dailyTargets" in body)
    payload.dailyTargets = buildNutritionTargets(body.dailyTargets || {});
  if ("meals" in body) payload.meals = buildNutritionMeals(body.meals);

  return payload;
}

function buildWorkoutTargets(targets = {}) {
  const payload = {};

  ["workouts", "cardioMinutes", "steps"].forEach((field) => {
    const parsed = parseOptionalNumber(
      targets[field],
      `weeklyTargets.${field}`,
    );
    if (parsed !== undefined) payload[field] = parsed;
  });

  return payload;
}

function buildWorkoutExercises(exercises, dayIndex) {
  return ensureArray(exercises, `days[${dayIndex}].exercises`).map(
    (exercise, exerciseIndex) => {
      const name = parseOptionalText(exercise?.name) || "";
      if (!name) {
        throw createBadRequest(
          `חסר שם לתרגיל מספר ${exerciseIndex + 1} ביום ${dayIndex + 1}`,
        );
      }

      return {
        id: exercise?.id || `exercise-${dayIndex + 1}-${exerciseIndex + 1}`,
        order:
          parseOptionalNumber(
            exercise?.order,
            `days[${dayIndex}].exercises[${exerciseIndex}].order`,
          ) ?? exerciseIndex + 1,
        name,
        externalExerciseId:
          parseOptionalText(exercise?.externalExerciseId) || "",
        mediaUrl: parseOptionalText(exercise?.mediaUrl) || "",
        sets: parseOptionalNumber(
          exercise?.sets,
          `days[${dayIndex}].exercises[${exerciseIndex}].sets`,
        ),
        reps: parseOptionalNumber(
          exercise?.reps,
          `days[${dayIndex}].exercises[${exerciseIndex}].reps`,
        ),
        restSeconds: parseOptionalNumber(
          exercise?.restSeconds,
          `days[${dayIndex}].exercises[${exerciseIndex}].restSeconds`,
        ),
        durationSeconds: parseOptionalNumber(
          exercise?.durationSeconds,
          `days[${dayIndex}].exercises[${exerciseIndex}].durationSeconds`,
        ),
        notes: parseOptionalText(exercise?.notes) || "",
      };
    },
  );
}

function buildWorkoutDays(days) {
  return ensureArray(days, "days").map((day, dayIndex) => {
    const name = parseOptionalText(day?.name) || "";
    if (!name) {
      throw createBadRequest(`חסר שם ליום אימון מספר ${dayIndex + 1}`);
    }

    return {
      id: day?.id || `day-${dayIndex + 1}`,
      name,
      focus: parseOptionalText(day?.focus) || "",
      notes: parseOptionalText(day?.notes) || "",
      exercises: buildWorkoutExercises(day?.exercises || [], dayIndex),
    };
  });
}

function buildWorkoutPlanPayload(body) {
  const payload = {};

  if ("title" in body)
    payload.title = parseOptionalText(body.title) || "תוכנית אימון אישית";
  if ("goalFocus" in body)
    payload.goalFocus = parseOptionalText(body.goalFocus) || "";
  if ("notes" in body) payload.notes = parseOptionalText(body.notes) || "";
  if ("weeklyTargets" in body)
    payload.weeklyTargets = buildWorkoutTargets(body.weeklyTargets || {});
  if ("days" in body) payload.days = buildWorkoutDays(body.days);

  return payload;
}

function buildFoodDiaryMeals(body) {
  const source =
    body?.meals && typeof body.meals === "object"
      ? body.meals
      : body && typeof body === "object"
        ? body
        : {};

  return FOOD_DIARY_MEAL_TYPES.reduce(
    (accumulator, mealType) => {
      accumulator[mealType] = Array.isArray(source[mealType])
        ? source[mealType].map((item, index) => {
            const name = parseOptionalText(item?.name) || "";
            if (!name) {
              throw createBadRequest(
                `חסר שם לפריט מספר ${index + 1} ב${mealType}`,
              );
            }

            return {
              id:
                item?.id || `food-diary-${mealType}-${Date.now()}-${index + 1}`,
              name,
              portion: parseOptionalText(item?.portion) || "",
              calories:
                parseOptionalNumber(
                  item?.calories,
                  `${mealType}[${index}].calories`,
                ) ?? 0,
              protein:
                parseOptionalNumber(
                  item?.protein,
                  `${mealType}[${index}].protein`,
                ) ?? 0,
              carbs:
                parseOptionalNumber(
                  item?.carbs,
                  `${mealType}[${index}].carbs`,
                ) ?? 0,
              fat:
                parseOptionalNumber(item?.fat, `${mealType}[${index}].fat`) ??
                0,
              source: parseOptionalText(item?.source) || "coach",
              photoUri: parseOptionalText(item?.photoUri) || "",
            };
          })
        : [];

      return accumulator;
    },
    {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  );
}

// ─── GET /api/coach/clients - כל הלקוחות ────────────────────────────────────
router.get(
  "/clients",
  asyncHandler(async (req, res) => {
    const allUsers = await getAllUsers();
    const clients = allUsers
      .filter((u) => u.role === "client")
      .map(({ password, ...safe }) => safe) // מסיר סיסמאות
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: clients.length,
      clients,
    });
  }),
);

// ─── GET /api/coach/clients/:id - פרטי לקוחה ─────────────────────────────────
router.get(
  "/clients/:id",
  asyncHandler(async (req, res) => {
    const user = await getClientOrNull(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const { password, ...safe } = user;
    const [
      weightHistory,
      updates,
      meetings,
      messages,
      goals,
      todayFoodDiary,
      foodDiaryEntries,
      nutritionPlan,
      workoutPlan,
      latestCheckInEntry,
    ] = await Promise.all([
      getWeightHistory(user.id),
      getUpdates(user.id),
      getMeetings(user.id),
      getMessages(user.id),
      getClientGoals(user.id),
      getFoodDiaryEntry(user.id, new Date().toISOString().split("T")[0]),
      listFoodDiaryEntries(user.id, 7),
      getNutritionPlan(user.id),
      getWorkoutPlan(user.id),
      getLatestCheckInEntry(user.id),
    ]);

    res.json({
      success: true,
      client: safe,
      weightHistory,
      updates,
      meetings,
      messages,
      goals,
      todayFoodDiary,
      foodDiaryEntries,
      nutritionPlan,
      workoutPlan,
      latestCheckInEntry,
    });
  }),
);

// ─── GET /api/coach/clients/:id/plans - כל תוכניות הלקוחה ──────────────────
router.get(
  "/clients/:id/plans",
  asyncHandler(async (req, res) => {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const [goals, nutritionPlan, workoutPlan] = await Promise.all([
      getClientGoals(client.id),
      getNutritionPlan(client.id),
      getWorkoutPlan(client.id),
    ]);

    res.json({
      success: true,
      goals,
      nutritionPlan,
      workoutPlan,
    });
  }),
);

// ─── GET /api/coach/clients/:id/goals - יעדי לקוחה ─────────────────────────
router.get(
  "/clients/:id/goals",
  asyncHandler(async (req, res) => {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    res.json({ success: true, goals: await getClientGoals(client.id) });
  }),
);

// ─── PUT /api/coach/clients/:id/goals - עדכון יעדים ────────────────────────
router.put("/clients/:id/goals", async (req, res) => {
  try {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const goals = await upsertClientGoals(client.id, {
      ...buildGoalsPayload(req.body || {}),
      updatedBy: req.user.id,
    });

    res.json({ success: true, message: "יעדי הלקוחה עודכנו ✅", goals });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בעדכון יעדים" });
  }
});

// ─── GET /api/coach/clients/:id/nutrition-plan - תפריט אישי ───────────────
router.get(
  "/clients/:id/nutrition-plan",
  asyncHandler(async (req, res) => {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    res.json({
      success: true,
      nutritionPlan: await getNutritionPlan(client.id),
    });
  }),
);

// ─── PUT /api/coach/clients/:id/nutrition-plan - עדכון תפריט אישי ─────────
router.put("/clients/:id/nutrition-plan", async (req, res) => {
  try {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const nutritionPlan = await upsertNutritionPlan(client.id, {
      ...buildNutritionPlanPayload(req.body || {}),
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "התפריט האישי עודכן ✅",
      nutritionPlan,
    });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בעדכון תפריט אישי" });
  }
});

// ─── GET /api/coach/clients/:id/food-diary - יומן אכילה של לקוחה ──────────
router.get(
  "/clients/:id/food-diary",
  asyncHandler(async (req, res) => {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const requestedDate = req.query.date
      ? String(req.query.date).trim()
      : new Date().toISOString().split("T")[0];

    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const includeRecent = req.query.includeRecent !== "false";
    const recentLimit = Math.max(
      1,
      Math.min(Number(req.query.recentLimit) || 7, 31),
    );

    const [entry, recentEntries] = await Promise.all([
      getFoodDiaryEntry(client.id, requestedDate),
      includeRecent
        ? listFoodDiaryEntries(client.id, recentLimit)
        : Promise.resolve([]),
    ]);

    res.json({ success: true, entry, recentEntries });
  }),
);

// ─── PUT /api/coach/clients/:id/food-diary/:date - עדכון יומן אכילה ──────
router.put("/clients/:id/food-diary/:date", async (req, res) => {
  try {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const requestedDate = String(req.params.date || "").trim();
    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const entry = await saveFoodDiaryEntry(client.id, requestedDate, {
      meals: buildFoodDiaryMeals(req.body || {}),
    });

    res.json({
      success: true,
      message: "יומן האכילה עודכן ✅",
      entry,
      recentEntries: await listFoodDiaryEntries(client.id, 7),
    });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בעדכון יומן האכילה" });
  }
});

// ─── GET /api/coach/clients/:id/workout-plan - תוכנית אימון ────────────────
router.get(
  "/clients/:id/workout-plan",
  asyncHandler(async (req, res) => {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    res.json({
      success: true,
      workoutPlan: await getWorkoutPlan(client.id),
    });
  }),
);

// ─── PUT /api/coach/clients/:id/workout-plan - עדכון תוכנית אימון ──────────
router.put("/clients/:id/workout-plan", async (req, res) => {
  try {
    const client = await getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const workoutPlan = await upsertWorkoutPlan(client.id, {
      ...buildWorkoutPlanPayload(req.body || {}),
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "תוכנית האימון עודכנה ✅",
      workoutPlan,
    });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בעדכון תוכנית אימון" });
  }
});

// ─── PUT /api/coach/clients/:id - עדכון פרטי לקוחה ──────────────────────────
router.put("/clients/:id", async (req, res) => {
  try {
    const user = await getClientOrNull(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const {
      name,
      email,
      phone,
      weight,
      height,
      age,
      goal,
      activityLevel,
      notes,
      coachStatus,
      coachTags,
      habitAssignments,
      checkInTemplate,
      isActive,
      newPassword,
    } = req.body;

    const updates = {};

    const normalizedName = parseOptionalText(name);
    if (normalizedName !== undefined) {
      if (!normalizedName) {
        return res.status(400).json({ error: "שם הלקוחה לא יכול להיות ריק" });
      }
      updates.name = normalizedName;
    }

    const normalizedEmail = parseOptionalEmail(email);
    if (normalizedEmail !== undefined) {
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ error: "אימייל זה כבר קיים במערכת" });
      }
      updates.email = normalizedEmail;
    }

    const normalizedPhone = parseOptionalText(phone);
    if (normalizedPhone !== undefined) updates.phone = normalizedPhone;

    const normalizedWeight = parseOptionalNumber(weight, "weight");
    if (normalizedWeight !== undefined) updates.weight = normalizedWeight;

    const normalizedHeight = parseOptionalNumber(height, "height");
    if (normalizedHeight !== undefined) updates.height = normalizedHeight;

    const normalizedAge = parseOptionalInteger(age, "age");
    if (normalizedAge !== undefined) updates.age = normalizedAge;

    const normalizedGoal = parseOptionalText(goal);
    if (normalizedGoal !== undefined) updates.goal = normalizedGoal;

    const normalizedActivityLevel = parseOptionalText(activityLevel);
    if (normalizedActivityLevel !== undefined) {
      updates.activityLevel = normalizedActivityLevel;
    }

    const normalizedNotes = parseOptionalText(notes);
    if (normalizedNotes !== undefined) updates.notes = normalizedNotes;

    const normalizedCoachStatus = parseOptionalText(coachStatus);
    if (normalizedCoachStatus !== undefined) updates.coachStatus = normalizedCoachStatus;

    const normalizedCoachTags = parseOptionalTags(coachTags);
    if (normalizedCoachTags !== undefined) updates.coachTags = normalizedCoachTags;

    const normalizedHabitAssignments = buildHabitAssignmentsPayload(habitAssignments);
    if (normalizedHabitAssignments !== undefined) {
      updates.habitAssignments = normalizedHabitAssignments;
    }

    const normalizedCheckInTemplate = buildCheckInTemplatePayload(checkInTemplate);
    if (normalizedCheckInTemplate !== undefined) {
      updates.checkInTemplate = normalizedCheckInTemplate;
    }

    const normalizedIsActive = parseOptionalBoolean(isActive, "isActive");
    if (normalizedIsActive !== undefined) updates.isActive = normalizedIsActive;

    // אפשרות לאפס סיסמה
    const normalizedNewPassword = parseOptionalText(newPassword);
    if (normalizedNewPassword) {
      if (normalizedNewPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "הסיסמה החדשה חייבת להיות לפחות 6 תווים" });
      }

      updates.password = await bcrypt.hash(normalizedNewPassword, 10);
    }

    const updated = await updateUser(req.params.id, updates);
    const { password, ...safe } = updated;

    res.json({ success: true, message: "פרטי הלקוחה עודכנו ✅", client: safe });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "אימייל זה כבר קיים במערכת" });
    }

    const status = err.status || 500;
    res
      .status(status)
      .json({ error: status === 500 ? "שגיאה בעדכון לקוחה" : err.message });
  }
});

// ─── POST /api/coach/clients - הוספת לקוחה ידנית ────────────────────────────
router.post("/clients", async (req, res) => {
  try {
    const { name, email, password, phone, weight, height, age, goal } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "שם, אימייל וסיסמה הם שדות חובה" });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "אימייל זה כבר קיים במערכת" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = await createUser({
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      password: hashedPassword,
      role: "client",
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      age: age ? parseInt(age) : null,
      goal: goal || "חיטוב",
      activityLevel: "מתונה",
      coachName: "שלהבת מחטבת",
      coachPhone: "0542213199",
      isActive: true,
      notes: "",
    });

    console.log(`✅ מאמנת הוסיפה לקוחה: ${newClient.name}`);

    const { password: pw, ...safe } = newClient;
    res.status(201).json({
      success: true,
      message: `לקוחה ${newClient.name} נוספה בהצלחה! ✅`,
      client: safe,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בהוספת לקוחה" });
  }
});

// ─── GET /api/coach/updates - עדכונים מהלקוחות ──────────────────────────────
router.get(
  "/updates",
  asyncHandler(async (req, res) => {
    const [allUsers, updates] = await Promise.all([
      getAllUsers(),
      getAllUpdates(),
    ]);

    // הוסף שם לקוחה לכל עדכון
    const enriched = updates.map((u) => {
      const client = allUsers.find((user) => user.id === u.userId);
      return { ...u, clientName: client ? client.name : "לא ידוע" };
    });

    res.json({ success: true, updates: enriched });
  }),
);

// ─── GET /api/coach/meetings - בקשות פגישות ──────────────────────────────────
router.get(
  "/meetings",
  asyncHandler(async (req, res) => {
    const [allUsers, meetings] = await Promise.all([
      getAllUsers(),
      getAllMeetings(),
    ]);

    const enriched = meetings.map((m) => {
      const client = allUsers.find((u) => u.id === m.userId);
      return { ...m, clientName: client ? client.name : "לא ידוע" };
    });

    res.json({ success: true, meetings: enriched });
  }),
);

// ─── PUT /api/coach/meetings/:id - אשר/דחה פגישה ────────────────────────────
router.put(
  "/meetings/:id",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ["ממתין לאישור", "אושר", "נדחה", "בוטל"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "סטטוס לא תקין" });
    }

    const meeting = await updateMeetingStatus(req.params.id, status);
    if (!meeting) {
      return res.status(404).json({ error: "פגישה לא נמצאה" });
    }

    res.json({
      success: true,
      message: `סטטוס פגישה עודכן: ${status}`,
      meeting,
    });
  }),
);

// ─── GET /api/coach/messages - כל ההודעות ────────────────────────────────────
router.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const [allUsers, messages] = await Promise.all([
      getAllUsers(),
      getAllMessages(),
    ]);

    const enriched = messages.map((m) => {
      const client = allUsers.find((u) => u.id === m.userId);
      return { ...m, clientName: client ? client.name : "לא ידוע" };
    });

    res.json({ success: true, messages: enriched });
  }),
);

// ─── POST /api/coach/messages/:userId - שלח הודעה ללקוחה ─────────────────────
router.post("/messages/:userId", async (req, res) => {
  try {
    const { text } = req.body;
    const { userId } = req.params;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: "נא לכתוב הודעה" });
    }

    const client = await getUserById(userId);
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const message = await addMessage(
      "coach-shalhevet",
      userId,
      text.trim(),
      "coach",
    );

    res.json({
      success: true,
      message: `ההודעה נשלחה ל${client.name}! ✅`,
      data: message,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשליחת הודעה" });
  }
});

// ─── GET /api/coach/stats - סטטיסטיקות ──────────────────────────────────────
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [allUsers, updates, meetings, messages] = await Promise.all([
      getAllUsers(),
      getAllUpdates(),
      getAllMeetings(),
      getAllMessages(),
    ]);

    const clients = allUsers.filter((u) => u.role === "client");
    const activeClients = clients.filter((u) => u.isActive);
    const pendingMeetings = meetings.filter((m) => m.status === "ממתין לאישור");
    const unreadUpdates = updates.filter((u) => !u.readByCoach);

    res.json({
      success: true,
      stats: {
        totalClients: clients.length,
        activeClients: activeClients.length,
        pendingMeetings: pendingMeetings.length,
        unreadUpdates: unreadUpdates.length,
        totalUpdates: updates.length,
        totalMeetings: meetings.length,
        totalMessages: messages.length,
      },
    });
  }),
);

// ─── GET /api/coach/meals - מאגר ארוחות ─────────────────────────────────────
router.get(
  "/meals",
  asyncHandler(async (req, res) => {
    const meals = await getAllCoachMeals();
    res.json({ success: true, count: meals.length, meals });
  }),
);

// ─── GET /api/coach/meals/:id - ארוחה ספציפית ────────────────────────────────
router.get(
  "/meals/:id",
  asyncHandler(async (req, res) => {
    const meal = await getCoachMealById(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "ארוחה לא נמצאה" });
    }
    res.json({ success: true, meal });
  }),
);

// ─── POST /api/coach/meals - הוספת ארוחה למאגר ──────────────────────────────
router.post("/meals", async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      servings,
      portion,
      ingredients,
      instructions,
      items,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "שם הארוחה הוא שדה חובה" });
    }

    const meal = await createCoachMeal({
      title: String(title).trim(),
      category: parseOptionalText(category) || "כללי",
      description: parseOptionalText(description) || "",
      imageUrl: imageUrl ? parseOptionalHttpUrl(imageUrl, "imageUrl") : "",
      calories: parseOptionalNumber(calories, "calories") ?? null,
      protein: parseOptionalNumber(protein, "protein") ?? null,
      carbs: parseOptionalNumber(carbs, "carbs") ?? null,
      fat: parseOptionalNumber(fat, "fat") ?? null,
      servings: parseOptionalNumber(servings, "servings") ?? 1,
      portion: parseOptionalText(portion) || "",
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      items: Array.isArray(items) ? items : [],
      createdBy: req.user.id,
    });

    console.log(`✅ מאמנת הוסיפה ארוחה למאגר: ${meal.title}`);
    res
      .status(201)
      .json({ success: true, message: `${meal.title} נוספה למאגר! ✅`, meal });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בהוספת ארוחה" });
  }
});

// ─── PUT /api/coach/meals/:id - עדכון ארוחה במאגר ───────────────────────────
router.put("/meals/:id", async (req, res) => {
  try {
    const existing = await getCoachMealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "ארוחה לא נמצאה" });
    }

    const {
      title,
      category,
      description,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      servings,
      portion,
      ingredients,
      instructions,
      items,
    } = req.body;

    const updates = {};
    if (title !== undefined) {
      const trimmedTitle = String(title).trim();
      if (!trimmedTitle) {
        return res.status(400).json({ error: "שם הארוחה לא יכול להיות ריק" });
      }
      updates.title = trimmedTitle;
    }
    if (category !== undefined)
      updates.category = parseOptionalText(category) || "כללי";
    if (description !== undefined)
      updates.description = parseOptionalText(description) || "";
    if (imageUrl !== undefined)
      updates.imageUrl = imageUrl
        ? parseOptionalHttpUrl(imageUrl, "imageUrl")
        : "";
    if (calories !== undefined)
      updates.calories = parseOptionalNumber(calories, "calories") ?? null;
    if (protein !== undefined)
      updates.protein = parseOptionalNumber(protein, "protein") ?? null;
    if (carbs !== undefined)
      updates.carbs = parseOptionalNumber(carbs, "carbs") ?? null;
    if (fat !== undefined)
      updates.fat = parseOptionalNumber(fat, "fat") ?? null;
    if (servings !== undefined)
      updates.servings = parseOptionalNumber(servings, "servings") ?? 1;
    if (portion !== undefined)
      updates.portion = parseOptionalText(portion) || "";
    if (ingredients !== undefined)
      updates.ingredients = Array.isArray(ingredients) ? ingredients : [];
    if (instructions !== undefined)
      updates.instructions = Array.isArray(instructions) ? instructions : [];
    if (items !== undefined) updates.items = Array.isArray(items) ? items : [];

    const meal = await updateCoachMeal(req.params.id, updates);
    res.json({ success: true, message: `${meal.title} עודכנה ✅`, meal });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "שגיאה בעדכון ארוחה" });
  }
});

// ─── DELETE /api/coach/meals/:id - מחיקת ארוחה מהמאגר ───────────────────────
router.delete("/meals/:id", async (req, res) => {
  try {
    const meal = await deleteCoachMeal(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "ארוחה לא נמצאה" });
    }
    res.json({ success: true, message: `${meal.title} נמחקה מהמאגר ✅` });
  } catch (err) {
    res.status(500).json({ error: "שגיאה במחיקת ארוחה" });
  }
});

module.exports = router;
