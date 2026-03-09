/**
 * שרת שלהבת מחטבת - Backend
 * ============================
 * זה "המוח" של האפליקציה. כל בקשה מהאפליקציה עוברת דרך כאן.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// ─── ניסיון לטעון חבילות אבטחה (אופציונלי - עובד גם בלעדיהן) ────────────────
let helmet, rateLimit;
try {
  helmet = require("helmet");
} catch {
  console.warn("⚠️  helmet לא מותקן - הרץ: npm install helmet");
}
try {
  rateLimit = require("express-rate-limit");
} catch {
  console.warn(
    "⚠️  express-rate-limit לא מותקן - הרץ: npm install express-rate-limit",
  );
}

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL;

// ─── הגדרות אבטחה ──────────────────────────────────────────────────────────
// Helmet - מוסיף headers אבטחה חשובים
if (helmet) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // מכובה כי ה-API הוא JSON בלבד
    }),
  );
}

// Rate Limiting - מגביל מספר בקשות לאותו IP
if (rateLimit) {
  // הגבלה כללית: 100 בקשות ל-15 דקות
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "יותר מדי בקשות - נסי שוב בעוד 15 דקות" },
  });

  // הגבלה קפדנית לנתיבי auth: 20 בקשות ל-15 דקות
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "יותר מדי ניסיונות כניסה - נסי שוב בעוד 15 דקות" },
  });

  app.use(generalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
}

// ─── CORS - הגדרה בטוחה יותר ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000", // Next.js web dev
  "http://localhost:19006", // Expo web dev
  "http://localhost:8081", // Expo metro
  "exp://localhost:8081", // Expo Go
  FRONTEND_URL, // Production URL (מה-.env)
  process.env.NGROK_URL, // ngrok URL (מה-.env)
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // אפשר בקשות ללא origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      // אפשר כל origin ב-development
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      // ב-production - בדוק מול רשימה לבנה
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("CORS: Origin לא מורשה"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const coachRoutes = require("./routes/coach");

app.use("/api/auth", authRoutes); // /api/auth/login, /api/auth/register
app.use("/api/users", usersRoutes); // /api/users/me, /api/users/weight
app.use("/api/coach", coachRoutes); // /api/coach/...

// ─── Health Check ─────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🔥 שרת שלהבת מחטבת עובד!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "נתיב לא נמצא",
    path: req.originalUrl,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("❌ שגיאת שרת:", err.message);

  // שגיאת CORS
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "גישה נדחתה" });
  }

  // שגיאת JSON לא תקין
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON לא תקין בבקשה" });
  }

  // שגיאה כללית - לא חושפים פרטים ב-production
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === "production"
        ? "שגיאת שרת פנימית"
        : err.message || "שגיאת שרת פנימית",
  });
});

// ─── הפעל שרת ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 שרת שלהבת מחטבת פועל!`);
  console.log(`📍 כתובת: http://localhost:${PORT}`);
  console.log(`🌍 סביבה: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔒 אבטחה: helmet=${!!helmet}, rate-limit=${!!rateLimit}\n`);
});

module.exports = app;
