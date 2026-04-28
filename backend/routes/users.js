/**
 * routes/users.js - פרופיל ונתוני לקוחה
 * =========================================
 * GET  /api/users/me           - פרטי המשתמשת המחוברת
 * PUT  /api/users/me           - עדכון פרטים
 * GET  /api/users/weight       - היסטוריית משקל
 * POST /api/users/weight       - עדכון משקל
 * GET  /api/users/updates      - עדכונים שלחתי למאמנת
 * POST /api/users/updates      - שלח עדכון למאמנת
 * GET  /api/users/meetings     - הפגישות שלי
 * POST /api/users/meetings     - בקש פגישה
 * GET  /api/users/messages     - הודעות מהמאמנת
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const {
  getClientGoals,
  getFoodDiaryEntry,
  getNutritionPlan,
  getWorkoutPlan,
  updateUser,
  deleteUser,
  getWeightHistory,
  addWeightEntry,
  getUpdates,
  addUpdate,
  getMeetings,
  addMeeting,
  getMessages,
  addMessage,
  listFoodDiaryEntries,
  saveFoodDiaryEntry,
    getCheckInEntry,
    getLatestCheckInEntry,
    upsertCheckInEntry,
    getHabitAssignmentsWithLogs,
    saveHabitLog,
} = require("../utils/db");
const { authenticate } = require("../middleware/auth");

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const FOOD_DIARY_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
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

function isValidWeekKey(value) {
  return /^\d{4}-W\d{1,2}$/.test(String(value || "").trim());
}

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFoodDiaryMeals(body) {
  const source =
    body?.meals && typeof body.meals === "object"
      ? body.meals
      : body && typeof body === "object"
        ? body
        : {};

  return FOOD_DIARY_MEAL_TYPES.reduce((accumulator, mealType) => {
    accumulator[mealType] = Array.isArray(source[mealType])
      ? source[mealType].map((item, index) => ({
          id:
            item?.id ||
            `food-diary-${mealType}-${Date.now()}-${index + 1}`,
          name: String(item?.name || "פריט מזון").trim(),
          portion: String(item?.portion || "").trim(),
          calories: toSafeNumber(item?.calories),
          protein: toSafeNumber(item?.protein),
          carbs: toSafeNumber(item?.carbs),
          fat: toSafeNumber(item?.fat),
          source: String(item?.source || "").trim(),
          photoUri: String(item?.photoUri || "").trim(),
        }))
      : [];

    return accumulator;
  }, {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });
}

function normalizeCheckInAnswerValue(type, value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (type === "number" || type === "scale") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (type === "yesNo") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  }

  const text = String(value || "").trim();
  return text || null;
}

function buildCheckInAnswers(template, rawAnswers) {
  const questions = Array.isArray(template?.questions) ? template.questions : [];
  const answersByQuestionId = new Map(
    Array.isArray(rawAnswers)
      ? rawAnswers.map((answer) => [String(answer?.questionId || "").trim(), answer])
      : [],
  );

  return questions
    .map((question, index) => {
      const label = String(question?.label || "").trim();
      const type = CHECK_IN_QUESTION_TYPES.has(question?.type)
        ? question.type
        : "shortText";
      const answer = answersByQuestionId.get(String(question?.id || "").trim());
      const value = normalizeCheckInAnswerValue(type, answer?.value);

      if (question?.required && value === null) {
        const fieldName = label || `שאלה ${index + 1}`;
        const err = new Error(`נא לענות על ${fieldName}`);
        err.status = 400;
        throw err;
      }

      if (value === null) {
        return null;
      }

      return {
        questionId: String(question?.id || `check-in-question-${index + 1}`),
        label: label || `שאלה ${index + 1}`,
        type,
        value,
      };
    })
    .filter(Boolean);
}

function formatCheckInAnswerValue(answer) {
  if (answer.type === "yesNo") {
    return answer.value ? "כן" : "לא";
  }

  if (answer.type === "scale") {
    return `${answer.value}/5`;
  }

  return String(answer.value);
}

function formatCheckInUpdateText(template, weekKey, answers, note) {
  const title = String(template?.title || "צ׳ק-אין שבועי").trim() || "צ׳ק-אין שבועי";
  const lines = answers.map(
    (answer) => `${answer.label}: ${formatCheckInAnswerValue(answer)}`,
  );

  if (note) {
    lines.push(`הערה כללית: ${note}`);
  }

  return `${title} (${weekKey})\n${lines.join("\n")}`;
}

// כל ה-routes דורשים כניסה
router.use(authenticate);

// ─── GET /api/users/me ────────────────────────────────────────────────────────
router.get("/me", (req, res) => {
  const { password, coachPrivateNotes, coach_private_notes, ...user } = req.user;
  res.json({ success: true, user });
});

// ─── GET /api/users/plans - כל התוכניות שלי ─────────────────────────────────
router.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const [goals, nutritionPlan, workoutPlan] = await Promise.all([
      getClientGoals(req.user.id),
      getNutritionPlan(req.user.id),
      getWorkoutPlan(req.user.id),
    ]);

    res.json({ success: true, goals, nutritionPlan, workoutPlan });
  }),
);

// ─── GET /api/users/goals - היעדים שלי ──────────────────────────────────────
router.get(
  "/goals",
  asyncHandler(async (req, res) => {
    res.json({ success: true, goals: await getClientGoals(req.user.id) });
  }),
);

// ─── GET /api/users/nutrition-plan - התפריט האישי שלי ─────────────────────
router.get(
  "/nutrition-plan",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      nutritionPlan: await getNutritionPlan(req.user.id),
    });
  }),
);

// ─── GET /api/users/food-diary - יומן אכילה יומי ───────────────────────────
router.get(
  "/food-diary",
  asyncHandler(async (req, res) => {
    const requestedDate = req.query.date
      ? String(req.query.date).trim()
      : new Date().toISOString().split("T")[0];

    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const includeRecent = req.query.includeRecent === "true";
    const recentLimit = Math.max(1, Math.min(Number(req.query.recentLimit) || 7, 31));

    const [entry, recentEntries] = await Promise.all([
      getFoodDiaryEntry(req.user.id, requestedDate),
      includeRecent ? listFoodDiaryEntries(req.user.id, recentLimit) : Promise.resolve([]),
    ]);

    res.json({ success: true, entry, recentEntries });
  }),
);

// ─── PUT /api/users/food-diary/:date - שמירת יומן אכילה ────────────────────
router.put("/food-diary/:date", async (req, res) => {
  try {
    const requestedDate = String(req.params.date || "").trim();

    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const entry = await saveFoodDiaryEntry(req.user.id, requestedDate, {
      meals: buildFoodDiaryMeals(req.body || {}),
    });

    res.json({
      success: true,
      message: "יומן האכילה עודכן ✅",
      entry,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשמירת יומן האכילה" });
  }
});

// ─── GET /api/users/workout-plan - תוכנית האימון שלי ───────────────────────
router.get(
  "/workout-plan",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      workoutPlan: await getWorkoutPlan(req.user.id),
    });
  }),
);

// ─── GET /api/users/habits - הרגלים ומשימות ליום נתון ──────────────────────
router.get(
  "/habits",
  asyncHandler(async (req, res) => {
    const requestedDate = req.query.date
      ? String(req.query.date).trim()
      : new Date().toISOString().split("T")[0];

    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const result = await getHabitAssignmentsWithLogs(req.user.id, requestedDate);

    res.json({
      success: true,
      date: result.date,
      habits: result.habits,
    });
  }),
);

// ─── PUT /api/users/habits/:habitId - סימון ביצוע הרגל ─────────────────────
router.put("/habits/:habitId", async (req, res) => {
  try {
    const habitId = String(req.params.habitId || "").trim();
    const requestedDate = req.body?.date
      ? String(req.body.date).trim()
      : new Date().toISOString().split("T")[0];

    if (!habitId) {
      return res.status(400).json({ error: "חסר מזהה הרגל" });
    }

    if (!isValidDateKey(requestedDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }

    const availableHabits = Array.isArray(req.user.habitAssignments)
      ? req.user.habitAssignments
      : [];
    const targetHabit = availableHabits.find((habit) => habit.id === habitId);

    if (!targetHabit || targetHabit.isActive === false) {
      return res.status(404).json({ error: "הרגל לא נמצא" });
    }

    await saveHabitLog(req.user.id, habitId, requestedDate, req.body?.completed === true || req.body?.completed === "true");
    const result = await getHabitAssignmentsWithLogs(req.user.id, requestedDate);

    res.json({
      success: true,
      message: "ההרגל עודכן ✅",
      date: result.date,
      habits: result.habits,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "שגיאה בעדכון ההרגל" });
  }
});

// ─── GET /api/users/check-in - טופס צ׳ק-אין שבועי ──────────────────────────
router.get(
  "/check-in",
  asyncHandler(async (req, res) => {
    const requestedWeekKey = req.query.weekKey
      ? String(req.query.weekKey).trim()
      : "";

    if (requestedWeekKey && !isValidWeekKey(requestedWeekKey)) {
      return res.status(400).json({ error: "weekKey לא תקין" });
    }

    const [entry, latestEntry] = await Promise.all([
      requestedWeekKey ? getCheckInEntry(req.user.id, requestedWeekKey) : Promise.resolve(null),
      getLatestCheckInEntry(req.user.id),
    ]);

    res.json({
      success: true,
      template: req.user.checkInTemplate || { title: "", intro: "", questions: [] },
      entry,
      latestEntry,
    });
  }),
);

// ─── PUT /api/users/check-in/:weekKey - שליחת צ׳ק-אין שבועי ────────────────
router.put("/check-in/:weekKey", async (req, res) => {
  try {
    const weekKey = String(req.params.weekKey || "").trim();
    const template = req.user.checkInTemplate || { title: "", intro: "", questions: [] };

    if (!isValidWeekKey(weekKey)) {
      return res.status(400).json({ error: "weekKey לא תקין" });
    }

    if (!Array.isArray(template.questions) || template.questions.length === 0) {
      return res.status(400).json({ error: "עדיין לא הוגדר טופס צ׳ק-אין עבורך" });
    }

    const answers = buildCheckInAnswers(template, req.body?.answers || []);
    const note = String(req.body?.note || "").trim();
    const existingEntry = await getCheckInEntry(req.user.id, weekKey);
    const entry = await upsertCheckInEntry(req.user.id, weekKey, {
      template,
      answers,
      note,
    });

    let update = null;
    if (!existingEntry) {
      update = await addUpdate(
        req.user.id,
        formatCheckInUpdateText(template, weekKey, answers, note),
      );
    }

    res.json({
      success: true,
      message: existingEntry ? "הצ׳ק-אין עודכן ✅" : "הצ׳ק-אין נשלח ✅",
      entry,
      update,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "שגיאה בשליחת הצ׳ק-אין" });
  }
});

// ─── PUT /api/users/me - עדכון פרטים ─────────────────────────────────────────
router.put("/me", async (req, res) => {
  try {
    const { name, phone, weight, height, age, goal, activityLevel } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone;
    if (weight) updates.weight = parseFloat(weight);
    if (height) updates.height = parseFloat(height);
    if (age) updates.age = parseInt(age);
    if (goal) updates.goal = goal;
    if (activityLevel) updates.activityLevel = activityLevel;

    const updated = await updateUser(req.user.id, updates);
    const { password, coachPrivateNotes, coach_private_notes, ...safeUser } = updated;

    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בעדכון פרטים" });
  }
});

// ─── GET /api/users/weight - היסטוריית משקל ─────────────────────────────────
router.get(
  "/weight",
  asyncHandler(async (req, res) => {
    const history = await getWeightHistory(req.user.id);
    res.json({ success: true, history });
  }),
);

// ─── POST /api/users/weight - עדכון משקל ─────────────────────────────────────
router.post("/weight", async (req, res) => {
  try {
    const { weight } = req.body;

    if (!weight || isNaN(weight) || weight < 30 || weight > 200) {
      return res.status(400).json({ error: 'משקל לא תקין (30-200 ק"ג)' });
    }

    // שמור בהיסטוריה
    const entry = await addWeightEntry(req.user.id, parseFloat(weight));

    // עדכן גם בפרופיל המשתמשת
    await updateUser(req.user.id, { weight: parseFloat(weight) });

    res.json({
      success: true,
      message: `משקל עודכן: ${weight} ק"ג ✅`,
      entry,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בעדכון משקל" });
  }
});

// ─── GET /api/users/updates - עדכונים שלי ────────────────────────────────────
router.get(
  "/updates",
  asyncHandler(async (req, res) => {
    const updates = await getUpdates(req.user.id);
    res.json({ success: true, updates });
  }),
);

// ─── POST /api/users/updates - שלח עדכון למאמנת ──────────────────────────────
router.post("/updates", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ error: "נא לכתוב עדכון" });
    }

    const update = await addUpdate(req.user.id, text.trim());

    res.json({
      success: true,
      message: "העדכון נשלח לשלהבת! ✅",
      update,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשליחת עדכון" });
  }
});

// ─── GET /api/users/meetings - הפגישות שלי ───────────────────────────────────
router.get(
  "/meetings",
  asyncHandler(async (req, res) => {
    const meetings = await getMeetings(req.user.id);
    res.json({ success: true, meetings });
  }),
);

// ─── POST /api/users/meetings - בקש פגישה ────────────────────────────────────
router.post("/meetings", async (req, res) => {
  try {
    const { requestedDate, notes } = req.body;

    if (!requestedDate) {
      return res.status(400).json({ error: "נא לציין תאריך מבוקש" });
    }

    const meeting = await addMeeting(req.user.id, requestedDate, notes || "");

    res.json({
      success: true,
      message: "בקשת הפגישה נשלחה לשלהבת! ✅",
      meeting,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשליחת בקשת פגישה" });
  }
});

// ─── GET /api/users/messages - הודעות ────────────────────────────────────────
router.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const messages = await getMessages(req.user.id);
    res.json({ success: true, messages });
  }),
);

// ─── POST /api/users/messages - שלח הודעה ────────────────────────────────────
router.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: "נא לכתוב הודעה" });
    }

    const message = await addMessage(
      req.user.id,
      "coach-shalhevet",
      text.trim(),
      "client",
    );

    res.json({
      success: true,
      message: "ההודעה נשלחה! ✅",
      data: message,
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשליחת הודעה" });
  }
});

// ─── PUT /api/users/password - שינוי סיסמה ───────────────────────────────────
router.put("/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "נא למלא סיסמה נוכחית וחדשה" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "הסיסמה החדשה חייבת להיות לפחות 6 תווים" });
    }

    // בדוק סיסמה נוכחית
    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "הסיסמה הנוכחית שגויה" });
    }

    // הצפן ושמור
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUser(req.user.id, { password: hashedPassword });

    res.json({ success: true, message: "הסיסמה עודכנה בהצלחה ✅" });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשינוי סיסמה" });
  }
});

// מחיקת חשבון - הלקוחה מוחקת את החשבון של עצמה
router.delete("/me", async (req, res) => {
  try {
    if (req.user?.role === "coach") {
      return res.status(403).json({ error: "מאמנת לא יכולה למחוק חשבון דרך האפליקציה" });
    }
    const result = await deleteUser(req.user.id);
    if (!result) {
      return res.status(404).json({ error: "המשתמשת לא נמצאה" });
    }
    res.json({ success: true, message: "החשבון נמחק" });
  } catch (err) {
    console.error("[users] deleteUser failed", err);
    res.status(500).json({ error: "שגיאה במחיקת חשבון" });
  }
});

module.exports = router;
