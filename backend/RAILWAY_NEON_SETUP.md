# פריסת Backend ל-Railway עם Neon

המטרה של המסמך הזה היא להעביר את ה-backend מהמחשב שלך ל-Railway, בזמן שהמסד נשאר ב-Neon.

בסוף התהליך:

1. ה-backend יהיה זמין דרך כתובת ציבורית של Railway
2. ה-backend יעבוד מול PostgreSQL ב-Neon
3. כבר לא תצטרכי `ngrok` בשביל השרת
4. עדיין תצטרכי Expo או build של האפליקציה כדי לפתוח את המובייל עצמו

## מה כבר מוכן בפרויקט

החלקים הבאים כבר מוכנים:

1. ה-backend עובד מול PostgreSQL בזמן ריצה
2. החיבור ל-Neon נבדק בהצלחה
3. הנתונים מ-`db.json` כבר יובאו ל-Neon
4. קיים `healthcheck` בנתיב `/api/health`
5. נוצר קובץ config ל-Railway: `backend/railway.json`

## מה אני לא יכול לעשות במקומך

יש כמה פעולות שדורשות את החשבון שלך ב-Railway ולכן אני לא יכול לבצע אותן כסוכן:

1. להתחבר ל-Railway עם המשתמש שלך
2. לחבר את ריפו ה-GitHub שלך ל-Railway
3. להדביק סודות בדשבורד של Railway כמו `DATABASE_URL` ו-`JWT_SECRET`
4. לאשר את הפריסה ולקבל את הדומיין הציבורי

## שלב 1: להעלות את הקוד ל-GitHub

אם הריפו עוד לא נמצא ב-GitHub, צריך קודם להעלות אותו לשם, כי הדרך הכי פשוטה עם Railway היא חיבור ישיר ל-GitHub.

## שלב 2: יצירת פרויקט ב-Railway

1. היכנסי ל-`https://railway.com`
2. לחצי `New Project`
3. בחרי `Deploy from GitHub repo`
4. בחרי את הריפו של הפרויקט

## שלב 3: להגדיר שהשירות רץ מתוך `backend`

בגלל שזה monorepo, את צריכה להגדיר ל-Railway שהשירות הזה נבנה מתוך תיקיית `backend`.

בדשבורד של השירות:

1. כנסי ל-`Settings`
2. הגדירי `Root Directory` לערך:

```text
/backend
```

אם Railway מבקש גם נתיב לקובץ config, השתמשי ב:

```text
/backend/railway.json
```

## שלב 4: לוודא start command ו-healthcheck

ברוב המקרים Railway יזהה לבד, אבל אם לא:

1. `Start Command`:

```text
npm start
```

2. `Healthcheck Path`:

```text
/api/health
```

## שלב 5: משתני סביבה ב-Railway

בכרטיסיית `Variables` של השירות הוסיפי את המשתנים הבאים:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...הכתובת_המלאה_של_Neon...
PGSSL=true
JWT_SECRET=מחרוזת_ארוכה_ואקראית
COACH_EMAIL=shalhevet@gmail.com
COACH_PASSWORD=Shalhevet2024!
COACH_NAME=שלהבת מחטבת
COACH_PHONE=0542213199
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NGROK_URL=
```

הערות חשובות:

1. את `DATABASE_URL` תדביקי בדיוק כמו שקיבלת מ-Neon
2. את `JWT_SECRET` כדאי לייצר כמחרוזת חדשה וארוכה
3. `PORT` לא צריך להוסיף ידנית, Railway מגדיר אותו לבד
4. אפשר לסמן את `DATABASE_URL` ואת `JWT_SECRET` כ-sealed variables אם תרצי

## שלב 6: לפרוס ולבדוק

אחרי שהגדרת את המשתנים:

1. בצעי deploy
2. חכי שהשירות יעלה
3. קחי את הדומיין הציבורי של Railway
4. פתחי בדפדפן:

```text
https://YOUR-RAILWAY-DOMAIN/api/health
```

אם הכל תקין, תקבלי JSON עם `status: ok`.

## שלב 7: לחבר את המובייל ל-Railway

אחרי שיש לך דומיין ציבורי של Railway, יש לך 2 אפשרויות:

### אפשרות פשוטה

ליצור קובץ:

`shalhevet-app/.env`

עם התוכן הבא:

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN/api
```

### אפשרות ידנית

לפתוח את `shalhevet-app/src/config.js` ולעדכן ידנית את `MANUAL_ENV` ל-`production` ואת כתובת ה-`production`.

## שלב 8: איך פותחים את האפליקציה אחרי Railway

אחרי שה-backend כבר על Railway:

1. לא צריך יותר `ngrok` בשביל השרת
2. אפשר להריץ את Expo כרגיל מהמחשב שלך
3. יש גם סקריפט מוכן: `shalhevet-app/הפעל-railway.bat`
4. אם את רוצה ששני טלפונים יפתחו את האפליקציה בלי להיות על אותה רשת, עדיין אפשר להשתמש ב-`expo start --tunnel`
5. אם את רוצה שלא יהיה בכלל תלות במחשב שלך, השלב הבא יהיה build אמיתי של APK או TestFlight

## הסדר שאני ממליץ לעבוד בו

1. לפרוס את ה-backend ל-Railway
2. לבדוק את `/api/health`
3. לחבר את `shalhevet-app` לכתובת Railway
4. לבדוק את האפליקציה ב-Expo על שני טלפונים
5. אחר כך לעבור ל-build אמיתי להפצה