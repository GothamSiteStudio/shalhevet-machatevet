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
  upsertClientGoals,
  getNutritionPlan,
  upsertNutritionPlan,
  getWorkoutPlan,
  upsertWorkoutPlan,
  getWeightHistory,
  getAllUpdates,
  getAllMeetings,
  updateMeetingStatus,
  getAllMessages,
  addMessage,
  readDB,
} = require("../utils/db");
const { authenticate, requireCoach } = require("../middleware/auth");

// כל ה-routes דורשים כניסה וזכות מאמנת
router.use(authenticate);
router.use(requireCoach);

function createBadRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function getClientOrNull(userId) {
  const user = getUserById(userId);
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

function parseOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value).trim();
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

// ─── GET /api/coach/clients - כל הלקוחות ────────────────────────────────────
router.get("/clients", (req, res) => {
  const allUsers = getAllUsers();
  const clients = allUsers
    .filter((u) => u.role === "client")
    .map(({ password, ...safe }) => safe) // מסיר סיסמאות
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    count: clients.length,
    clients,
  });
});

// ─── GET /api/coach/clients/:id - פרטי לקוחה ─────────────────────────────────
router.get("/clients/:id", (req, res) => {
  const user = getClientOrNull(req.params.id);

  if (!user) {
    return res.status(404).json({ error: "לקוחה לא נמצאה" });
  }

  const { password, ...safe } = user;
  const weightHistory = getWeightHistory(user.id);
  const db = readDB();
  const updates = db.updates.filter((u) => u.userId === user.id);
  const meetings = db.meetings.filter((m) => m.userId === user.id);
  const messages = db.messages.filter((m) => m.userId === user.id);
  const goals = getClientGoals(user.id);
  const nutritionPlan = getNutritionPlan(user.id);
  const workoutPlan = getWorkoutPlan(user.id);

  res.json({
    success: true,
    client: safe,
    weightHistory,
    updates,
    meetings,
    messages,
    goals,
    nutritionPlan,
    workoutPlan,
  });
});

// ─── GET /api/coach/clients/:id/plans - כל תוכניות הלקוחה ──────────────────
router.get("/clients/:id/plans", (req, res) => {
  const client = getClientOrNull(req.params.id);

  if (!client) {
    return res.status(404).json({ error: "לקוחה לא נמצאה" });
  }

  res.json({
    success: true,
    goals: getClientGoals(client.id),
    nutritionPlan: getNutritionPlan(client.id),
    workoutPlan: getWorkoutPlan(client.id),
  });
});

// ─── GET /api/coach/clients/:id/goals - יעדי לקוחה ─────────────────────────
router.get("/clients/:id/goals", (req, res) => {
  const client = getClientOrNull(req.params.id);

  if (!client) {
    return res.status(404).json({ error: "לקוחה לא נמצאה" });
  }

  res.json({ success: true, goals: getClientGoals(client.id) });
});

// ─── PUT /api/coach/clients/:id/goals - עדכון יעדים ────────────────────────
router.put("/clients/:id/goals", (req, res) => {
  try {
    const client = getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const goals = upsertClientGoals(client.id, {
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
router.get("/clients/:id/nutrition-plan", (req, res) => {
  const client = getClientOrNull(req.params.id);

  if (!client) {
    return res.status(404).json({ error: "לקוחה לא נמצאה" });
  }

  res.json({ success: true, nutritionPlan: getNutritionPlan(client.id) });
});

// ─── PUT /api/coach/clients/:id/nutrition-plan - עדכון תפריט אישי ─────────
router.put("/clients/:id/nutrition-plan", (req, res) => {
  try {
    const client = getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const nutritionPlan = upsertNutritionPlan(client.id, {
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

// ─── GET /api/coach/clients/:id/workout-plan - תוכנית אימון ────────────────
router.get("/clients/:id/workout-plan", (req, res) => {
  const client = getClientOrNull(req.params.id);

  if (!client) {
    return res.status(404).json({ error: "לקוחה לא נמצאה" });
  }

  res.json({ success: true, workoutPlan: getWorkoutPlan(client.id) });
});

// ─── PUT /api/coach/clients/:id/workout-plan - עדכון תוכנית אימון ──────────
router.put("/clients/:id/workout-plan", (req, res) => {
  try {
    const client = getClientOrNull(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const workoutPlan = upsertWorkoutPlan(client.id, {
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
    const user = getClientOrNull(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const {
      name,
      phone,
      weight,
      height,
      age,
      goal,
      activityLevel,
      notes,
      isActive,
      newPassword,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (weight !== undefined) updates.weight = parseFloat(weight);
    if (height !== undefined) updates.height = parseFloat(height);
    if (age !== undefined) updates.age = parseInt(age);
    if (goal !== undefined) updates.goal = goal;
    if (activityLevel !== undefined) updates.activityLevel = activityLevel;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;

    // אפשרות לאפס סיסמה
    if (newPassword && newPassword.length >= 6) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = updateUser(req.params.id, updates);
    const { password, ...safe } = updated;

    res.json({ success: true, message: "פרטי הלקוחה עודכנו ✅", client: safe });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בעדכון לקוחה" });
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

    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "אימייל זה כבר קיים במערכת" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = createUser({
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
router.get("/updates", (req, res) => {
  const allUsers = getAllUsers();
  const updates = getAllUpdates();

  // הוסף שם לקוחה לכל עדכון
  const enriched = updates.map((u) => {
    const client = allUsers.find((user) => user.id === u.userId);
    return { ...u, clientName: client ? client.name : "לא ידוע" };
  });

  res.json({ success: true, updates: enriched });
});

// ─── GET /api/coach/meetings - בקשות פגישות ──────────────────────────────────
router.get("/meetings", (req, res) => {
  const allUsers = getAllUsers();
  const meetings = getAllMeetings();

  const enriched = meetings.map((m) => {
    const client = allUsers.find((u) => u.id === m.userId);
    return { ...m, clientName: client ? client.name : "לא ידוע" };
  });

  res.json({ success: true, meetings: enriched });
});

// ─── PUT /api/coach/meetings/:id - אשר/דחה פגישה ────────────────────────────
router.put("/meetings/:id", (req, res) => {
  const { status } = req.body;
  const validStatuses = ["ממתין לאישור", "אושר", "נדחה", "בוטל"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "סטטוס לא תקין" });
  }

  const meeting = updateMeetingStatus(req.params.id, status);
  if (!meeting) {
    return res.status(404).json({ error: "פגישה לא נמצאה" });
  }

  res.json({ success: true, message: `סטטוס פגישה עודכן: ${status}`, meeting });
});

// ─── GET /api/coach/messages - כל ההודעות ────────────────────────────────────
router.get("/messages", (req, res) => {
  const allUsers = getAllUsers();
  const messages = getAllMessages();

  const enriched = messages.map((m) => {
    const client = allUsers.find((u) => u.id === m.userId);
    return { ...m, clientName: client ? client.name : "לא ידוע" };
  });

  res.json({ success: true, messages: enriched });
});

// ─── POST /api/coach/messages/:userId - שלח הודעה ללקוחה ─────────────────────
router.post("/messages/:userId", async (req, res) => {
  try {
    const { text } = req.body;
    const { userId } = req.params;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: "נא לכתוב הודעה" });
    }

    const client = getUserById(userId);
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "לקוחה לא נמצאה" });
    }

    const message = addMessage("coach-shalhevet", userId, text.trim(), "coach");

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
router.get("/stats", (req, res) => {
  const allUsers = getAllUsers();
  const db = readDB();

  const clients = allUsers.filter((u) => u.role === "client");
  const activeClients = clients.filter((u) => u.isActive);
  const pendingMeetings = db.meetings.filter(
    (m) => m.status === "ממתין לאישור",
  );
  const unreadUpdates = db.updates.filter((u) => !u.readByCoach);

  res.json({
    success: true,
    stats: {
      totalClients: clients.length,
      activeClients: activeClients.length,
      pendingMeetings: pendingMeetings.length,
      unreadUpdates: unreadUpdates.length,
      totalUpdates: db.updates.length,
      totalMeetings: db.meetings.length,
      totalMessages: db.messages.length,
    },
  });
});

module.exports = router;
