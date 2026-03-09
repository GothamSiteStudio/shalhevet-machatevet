/**
 * middleware/auth.js - אימות זהות
 * ==================================
 * כל בקשה שמגיעה לשרת עוברת דרך כאן.
 * אנחנו בודקים שהמשתמשת "מחזיקה את המפתח" (JWT Token).
 * 
 * איך זה עובד:
 * 1. משתמשת נכנסת עם אימייל + סיסמה
 * 2. השרת נותן לה "תעודת כניסה" (Token)
 * 3. בכל בקשה עתידית, היא שולחת את התעודה הזו
 * 4. ה-middleware בודק שהתעודה תקפה
 */

const jwt = require('jsonwebtoken');
const { getUserById } = require('../utils/db');

// ─── בדיקת אימות בסיסית ─────────────────────────────────────────────────────
async function authenticate(req, res, next) {
  try {
    // קח את הטוקן מה-Header של הבקשה
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'אין הרשאה',
        message: 'נא להתחבר כדי לגשת לנתון זה'
      });
    }
    
    // הסר את המילה "Bearer " ותשאיר רק את הטוקן
    const token = authHeader.substring(7);
    
    // בדוק שהטוקן תקף
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // מצא את המשתמשת
    const user = await getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'משתמשת לא נמצאה',
        message: 'חשבון זה לא קיים יותר'
      });
    }
    
    // שמור את פרטי המשתמשת לשימוש ב-route
    req.user = user;
    next();
    
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'פג תוקף הכניסה',
        message: 'נא להתחבר מחדש'
      });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'טוקן לא תקף',
        message: 'נא להתחבר מחדש'
      });
    }
    console.error('❌ שגיאת אימות:', err);
    return res.status(500).json({
      error: 'שגיאת שרת',
      message: 'לא הצלחנו לאמת את המשתמשת'
    });
  }
}

// ─── בדיקה שהמשתמשת היא מאמנת ───────────────────────────────────────────────
function requireCoach(req, res, next) {
  if (req.user.role !== 'coach') {
    return res.status(403).json({
      error: 'אין הרשאה',
      message: 'רק המאמנת יכולה לגשת לאזור זה'
    });
  }
  next();
}

// ─── בדיקה שהמשתמשת היא לקוחה ───────────────────────────────────────────────
function requireClient(req, res, next) {
  if (req.user.role !== 'client') {
    return res.status(403).json({
      error: 'אין הרשאה',
      message: 'אזור זה מיועד ללקוחות בלבד'
    });
  }
  next();
}

module.exports = { authenticate, requireCoach, requireClient };
