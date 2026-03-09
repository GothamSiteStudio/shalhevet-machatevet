/**
 * routes/auth.js - כניסה והרשמה
 * ================================
 * POST /api/auth/register - הרשמת לקוחה חדשה
 * POST /api/auth/login    - כניסה לחשבון
 * GET  /api/auth/me       - מי אני? (בדיקת טוקן)
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getUserByEmail, createUser } = require("../utils/db");
const { authenticate } = require("../middleware/auth");

// ─── יצירת JWT Token ──────────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }, // הטוקן תקף 30 יום
  );
}

// ─── פרופיל מינימלי לשליחה (ללא סיסמה!) ─────────────────────────────────────
function safeUser(user) {
  const { password, ...safe } = user; // מסיר את הסיסמה
  return safe;
}

// ─── POST /api/auth/register - הרשמה ────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, weight, height, age, goal } =
      req.body;

    // בדיקות בסיסיות
    if (!name || !email || !password) {
      return res.status(400).json({ error: "נא למלא שם, אימייל וסיסמה" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "הסיסמה חייבת להיות לפחות 6 תווים" });
    }

    // בדוק שהאימייל לא קיים כבר
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "אימייל זה כבר רשום במערכת" });
    }

    // הצפן את הסיסמה
    // bcrypt הופך "1234" ל-"$2a$10$Kd..." - כך שאי אפשר לפענח
    const hashedPassword = await bcrypt.hash(password, 10);

    // צור משתמשת חדשה
    const newUser = await createUser({
      id: uuidv4(), // מזהה ייחודי אקראי
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      password: hashedPassword,
      role: "client", // לקוחה (לא מאמנת)
      weight: weight || null,
      height: height || null,
      age: age || null,
      goal: goal || "חיטוב",
      activityLevel: "מתונה",
      coachName: "שלהבת מחטבת",
      coachPhone: "0542213199",
      isActive: true,
      notes: "", // הערות של המאמנת
    });

    // צור טוקן
    const token = generateToken(newUser);

    console.log(`✅ לקוחה חדשה נרשמה: ${newUser.name} (${newUser.email})`);

    res.status(201).json({
      success: true,
      message: "ברוכה הבאה! החשבון נוצר בהצלחה 🎉",
      token,
      user: safeUser(newUser),
    });
  } catch (err) {
    console.error("❌ שגיאת הרשמה:", err);
    res.status(500).json({ error: "שגיאת שרת - נסי שוב" });
  }
});

// ─── POST /api/auth/login - כניסה ────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "נא למלא אימייל וסיסמה" });
    }

    // מצא את המשתמשת לפי אימייל
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "אימייל או סיסמה שגויים" });
    }

    // בדוק סיסמה (bcrypt.compare משווה סיסמה גולמית להצפנה)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "אימייל או סיסמה שגויים" });
    }

    // צור טוקן חדש
    const token = generateToken(user);

    console.log(`🔓 כניסה: ${user.name} (${user.role})`);

    res.json({
      success: true,
      message: `ברוכה הבאה, ${user.name}! 💪`,
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("❌ שגיאת כניסה:", err);
    res.status(500).json({ error: "שגיאת שרת - נסי שוב" });
  }
});

// ─── GET /api/auth/me - מי אני? ──────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({
    success: true,
    user: safeUser(req.user),
  });
});

// ─── POST /api/auth/forgot-password - שכחתי סיסמה ─────────────────────────
router.post("/forgot-password", async (req, res) => {
  // בגרסה הבאה: שליחת אימייל עם קישור לאיפוס
  // כרגע: מחזיר הדרכה ידנית
  res.json({
    success: true,
    message: "צרי קשר עם שלהבת בוואטסאפ: 0542213199 לאיפוס הסיסמה",
  });
});

module.exports = router;
