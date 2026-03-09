/**
 * src/config.js - הגדרות סביבה
 * ================================
 * שנה כאן את כתובת השרת לפי הצורך.
 *
 * ⚙️ מצבים אפשריים:
 *   'local'      → רשת WiFi משותפת (המחשב והטלפון על אותו WiFi)
 *   'tunnel'     → ngrok tunnel (עובד מכל מקום ברשת, גם ללא WiFi משותף)
 *   'production' → שרת ענן (Railway) - לאחר פרסום
 */

// ─── 🔧 שנה את השורה הזו בלבד ──────────────────────────────────────────────
const MANUAL_ENV = 'local'; // 'local' | 'tunnel' | 'production'
// ─────────────────────────────────────────────────────────────────────────────

const ENV = process.env.EXPO_PUBLIC_APP_ENV || MANUAL_ENV;

const CONFIG = {
  local: {
    // כתובת IP של המחשב ברשת הביתית (הרץ "ipconfig" ב-CMD למציאת הכתובת)
    API_URL: 'http://192.168.0.169:5000/api',
    label: 'רשת מקומית',
  },

  tunnel: {
    // כתובת ה-ngrok שנוצרת כשמריצים את backend/הפעל-ngrok.bat
    // ⚠️ עדכן את הכתובת הזו בכל פעם שמפעילים את ngrok מחדש!
    API_URL: 'https://REPLACE_WITH_NGROK_URL.ngrok-free.app/api',
    label: 'Tunnel (ngrok)',
  },

  production: {
    // כתובת שרת הענן לאחר פרסום ל-Railway
    API_URL:
      process.env.EXPO_PUBLIC_API_URL ||
      'https://REPLACE_WITH_RAILWAY_URL.up.railway.app/api',
    label: 'Production (Railway)',
  },
};

const currentConfig = CONFIG[ENV] || CONFIG.local;

if (__DEV__) {
  console.log(`\n🔥 שלהבת מחטבת - מצב חיבור: ${currentConfig.label}`);
  console.log(`🌐 API URL: ${currentConfig.API_URL}\n`);
}

export default {
  ENV,
  API_URL: currentConfig.API_URL,
};
