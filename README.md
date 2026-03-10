# 🔥 שלהבת מחטבת - Fitness App

> אפליקציית כושר ותזונה אישית לנשים | מאמנת: שלהבת מחטבת

---

## 🏗️ מבנה הפרויקט

```
שלהבת מחטבת אפליקציה/
├── 📱 shalhevet-app/        # React Native / Expo (אפליקציית מובייל)
├── ⚙️  backend/             # Node.js + Express (API שרת)
└── .vscode/                 # הגדרות VS Code לכל הצוות
```

---

## 🚀 הרצת הפרויקט

### הכל במקביל (Windows):
```bash
# פתח את הקובץ:
הפעל-הכל-לנייד.bat
```

### כל שירות בנפרד:

**Backend (שרת):**
```bash
cd backend
npm run dev        # פיתוח עם nodemon
npm start          # production
```

**Mobile App (Expo):**
```bash
cd shalhevet-app
npm start          # Expo DevTools
npm run android    # Android
npm run ios        # iOS
npm run lint       # בדיקת קוד
```

---

## 🛠️ Stack טכנולוגי

| חלק | טכנולוגיה | גרסה |
|-----|-----------|-------|
| Mobile | React Native + Expo | SDK 54 |
| Backend | Node.js + Express | - |
| State | Zustand | 4.5 |
| Auth | JWT + bcryptjs | - |
| DB | LowDB (JSON file) | 1.0 |
| Icons | @expo/vector-icons | - |

---

## 🎨 Design System

### צבעים:
```
Background:   #0f0f10
Surface:      #18181b
Surface Light: #202024
Primary:      #f08000
Text:         #f4f4f5
Text Muted:   #b6b6bd
Border:       #2a2a31
```

### גופן: `Heebo` (Google Fonts)
### כיוון: RTL (עברית)
### ธีมה: Dark Mode only

---

## ♿ נגישות (WCAG 2.1)

### Mobile App:
- ✅ `accessible={true}` + `accessibilityLabel` על כל element אינטרקטיבי
- ✅ `accessibilityRole` נכון (`button`, `link`, `radio`, `header`)
- ✅ `accessibilityState` (`disabled`, `busy`, `checked`, `expanded`)
- ✅ `accessibilityHint` לתיאור פעולה
- ✅ `minHeight: 44` על כל touch target (Apple HIG)
- ✅ `accessibilityViewIsModal={true}` ב-Modals
- ✅ `AccessibilityInfo.announceForAccessibility()` לעדכונים
- ✅ `KeyboardAvoidingView` עם `behavior` נכון לפי פלטפורמה
- ✅ `importantForAccessibility="no-hide-descendants"` לאלמנטים דקורטיביים

---

## 🔒 אבטחה (Backend)

- ✅ **Helmet** - Security headers (X-Frame-Options, HSTS, etc.)
- ✅ **Rate Limiting** - 100 req/15min כללי, 20 req/15min ל-auth
- ✅ **CORS** חכם - פתוח ב-dev, רשימה לבנה ב-production
- ✅ **JWT** tokens - תוקף 30 יום
- ✅ **bcrypt** - hashing של סיסמאות (10 rounds)
- ✅ **Global Error Handler** - לא חושף stack traces ב-production
- ✅ **404 Handler** - תגובה אחידה לנתיבים לא קיימים
- ✅ **Sanitization** - `password` מוסר מכל תגובת API

### משתני סביבה (.env):
```env
PORT=5000
JWT_SECRET=your-super-secret-key-change-me
NODE_ENV=development
FRONTEND_URL=
NGROK_URL=                          # הוסיפי כשמשתמשים ב-ngrok
```

---

## 🧹 איכות קוד

### כלים מותקנים:

| כלי | מטרה |
|-----|------|
| **ESLint** | זיהוי שגיאות קוד |
| **eslint-plugin-react-native** | נגישות ב-React Native |
| **Prettier** | פורמט קוד אחיד |

### הרצת בדיקות:
```bash
# App
cd shalhevet-app
npm run lint          # בדיקת ESLint
npm run format        # פורמט עם Prettier
```

---

## 🔌 MCP Servers (AI Tools)

מוגדרים ב-`cline_mcp_settings.json`:

| Server | מטרה |
|--------|------|
| **playwright** | בדיקות browser אוטומטיות |
| **filesystem** | גישה מורחבת לקבצי הפרויקט |

---

## 📱 מסכי האפליקציה

### Mobile (React Native):
- `SplashScreen` - מסך טעינה
- `LoginScreen` - כניסה לחשבון ✅ נגישות מלאה
- `RegisterScreen` - הרשמה
- `HomeScreen` - דף בית עם תפריט מהיר ✅ נגישות מלאה
- `WorkoutScreen` - יומן אימונים
- `NutritionScreen` - מעקב תזונה
- `ProgressScreen` - מעקב התקדמות
- `ProfileScreen` - פרופיל אישי
- `CoachScreen` - תקשורת עם מאמנת
- `CoachDashboardScreen` - דשבורד מאמנת

---

## 📂 API Endpoints

```
POST   /api/auth/register       הרשמת לקוחה חדשה
POST   /api/auth/login          כניסה
GET    /api/auth/me             פרטי המשתמש הנוכחי
POST   /api/auth/forgot-password איפוס סיסמה

GET    /api/users/me            פרופיל מלא
PUT    /api/users/profile       עדכון פרופיל
POST   /api/users/weight        עדכון משקל
GET    /api/users/weight        היסטוריית משקל
GET    /api/users/progress      נתוני התקדמות

GET    /api/coach/clients       רשימת לקוחות (מאמנת בלבד)
GET    /api/health              בדיקת תקינות שרת
```

---

## 🔧 VS Code Extensions מומלצות

הפרויקט מגיע עם `.vscode/extensions.json` - VS Code יציע להתקין אוטומטית:
- **Prettier** - פורמט קוד
- **ESLint** - בדיקת קוד
- **Error Lens** - שגיאות ב-inline
- **GitLens** - ניהול Git
- **REST Client** - בדיקת API

---

## 🛣️ Roadmap

- [ ] מסד נתונים אמיתי (Supabase / PostgreSQL)
- [ ] Push Notifications
- [ ] Chat בזמן אמת (Socket.io)
- [ ] מעקב צעדים (Pedometer)
- [ ] אינטגרציה עם Apple Health / Google Fit
- [ ] כפתור שיתוף התקדמות
- [ ] גיבוי נתונים לענן
- [ ] בדיקות אוטומטיות (Jest + Playwright)

---

*🔥 פותח עם ❤️ עבור שלהבת מחטבת*
