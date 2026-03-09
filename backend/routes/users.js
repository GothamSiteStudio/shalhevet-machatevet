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
  getNutritionPlan,
  getWorkoutPlan,
  updateUser,
  getWeightHistory,
  addWeightEntry,
  getUpdates,
  addUpdate,
  getMeetings,
  addMeeting,
  getMessages,
  addMessage,
} = require("../utils/db");
const { authenticate } = require("../middleware/auth");

// כל ה-routes דורשים כניסה
router.use(authenticate);

// ─── GET /api/users/me ────────────────────────────────────────────────────────
router.get("/me", (req, res) => {
  const { password, ...user } = req.user;
  res.json({ success: true, user });
});

// ─── GET /api/users/plans - כל התוכניות שלי ─────────────────────────────────
router.get("/plans", (req, res) => {
  res.json({
    success: true,
    goals: getClientGoals(req.user.id),
    nutritionPlan: getNutritionPlan(req.user.id),
    workoutPlan: getWorkoutPlan(req.user.id),
  });
});

// ─── GET /api/users/goals - היעדים שלי ──────────────────────────────────────
router.get("/goals", (req, res) => {
  res.json({ success: true, goals: getClientGoals(req.user.id) });
});

// ─── GET /api/users/nutrition-plan - התפריט האישי שלי ─────────────────────
router.get("/nutrition-plan", (req, res) => {
  res.json({ success: true, nutritionPlan: getNutritionPlan(req.user.id) });
});

// ─── GET /api/users/workout-plan - תוכנית האימון שלי ───────────────────────
router.get("/workout-plan", (req, res) => {
  res.json({ success: true, workoutPlan: getWorkoutPlan(req.user.id) });
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

    const updated = updateUser(req.user.id, updates);
    const { password, ...safeUser } = updated;

    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בעדכון פרטים" });
  }
});

// ─── GET /api/users/weight - היסטוריית משקל ─────────────────────────────────
router.get("/weight", (req, res) => {
  const history = getWeightHistory(req.user.id);
  res.json({ success: true, history });
});

// ─── POST /api/users/weight - עדכון משקל ─────────────────────────────────────
router.post("/weight", async (req, res) => {
  try {
    const { weight } = req.body;

    if (!weight || isNaN(weight) || weight < 30 || weight > 200) {
      return res.status(400).json({ error: 'משקל לא תקין (30-200 ק"ג)' });
    }

    // שמור בהיסטוריה
    const entry = addWeightEntry(req.user.id, parseFloat(weight));

    // עדכן גם בפרופיל המשתמשת
    updateUser(req.user.id, { weight: parseFloat(weight) });

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
router.get("/updates", (req, res) => {
  const updates = getUpdates(req.user.id);
  res.json({ success: true, updates });
});

// ─── POST /api/users/updates - שלח עדכון למאמנת ──────────────────────────────
router.post("/updates", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ error: "נא לכתוב עדכון" });
    }

    const update = addUpdate(req.user.id, text.trim());

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
router.get("/meetings", (req, res) => {
  const meetings = getMeetings(req.user.id);
  res.json({ success: true, meetings });
});

// ─── POST /api/users/meetings - בקש פגישה ────────────────────────────────────
router.post("/meetings", async (req, res) => {
  try {
    const { requestedDate, notes } = req.body;

    if (!requestedDate) {
      return res.status(400).json({ error: "נא לציין תאריך מבוקש" });
    }

    const meeting = addMeeting(req.user.id, requestedDate, notes || "");

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
router.get("/messages", (req, res) => {
  const messages = getMessages(req.user.id);
  res.json({ success: true, messages });
});

// ─── POST /api/users/messages - שלח הודעה ────────────────────────────────────
router.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: "נא לכתוב הודעה" });
    }

    const message = addMessage(
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
    updateUser(req.user.id, { password: hashedPassword });

    res.json({ success: true, message: "הסיסמה עודכנה בהצלחה ✅" });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בשינוי סיסמה" });
  }
});

module.exports = router;
