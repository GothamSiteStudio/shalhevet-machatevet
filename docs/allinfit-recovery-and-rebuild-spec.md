# All-in-Fit → שלהבת מחטבת: מסמך שחזור ובנייה מחדש

> מסמך אב. מסכם את מה ששוחזר מאפליקציית All-in-Fit (Flutter) ואת התוכנית לבנות מחדש את הפיצ'רים בתוך אפליקציית שלהבת (React Native + Supabase).
> סימון מקור: **[שוחזר]** = ודאי, מתוך סמלים ב-`libapp.so`. **[הוסק]** = פרשנות שלנו. **[קיים]** = מהקוד/סכמה הקיימים של שלהבת.

---

## 1. תקציר מנהלים

- **All-in-Fit** היא אפליקציית Flutter + Supabase בוגרת — פלטפורמת SaaS רב-משתמשים לאימון אישי (107 מסכים, 44 שירותים).
- **קוד ה-UI (Dart) אבד** ואינו ניתן לשחזור (מהודר ל-machine code). **שוחזרו:** assets, ארכיטקטורה מלאה, מודל נתונים, אינטגרציות.
- **אין גישה** ל-Supabase המקורי → נבנה Supabase **חדש** ונשחזר את הסכמה מתוך המפרט הזה + הסכמה הקיימת של שלהבת.
- **כיוון:** לבנות הכל בתוך `shalhevet-app` (React Native), בקאנד = Supabase חדש.

## 2. מקור השחזור ומה הושג

| פריט | מקור | סטטוס |
|------|------|--------|
| Package / גרסה | `com.allinfit.app` v1.0.8 (build 13), iOS id `6758051083` | [שוחזר] |
| Assets | `extracted_assets/` — פונטים Heebo + NotoSansHebrew, לוגואים, ספלאש, שיידרים | [שוחזר] |
| Backend | Supabase `ayuyfaofrxbecffnntkz` (auth/rest/realtime/storage/functions) | [שוחזר] — אין גישה |
| מפתחות | רק `anon` key ציבורי. אין service_role / OpenAI / Google בצד הלקוח | [שוחזר] |
| ארטיפקטים | `C:\Users\orens\Downloads\allinfit_recovery\` | — |

## 3. הארכיטקטורה של All-in-Fit (משוחזר)

### 3.1 אינטגרציות ושירותי מפתח [שוחזר]
- **Auth:** Supabase Auth (`supabase_auth_service`), אימות ב-OTP
- **מנויים:** **RevenueCat** (`revenuecat_service`, `paywall_service`, `subscription_service`)
- **התראות:** Firebase Messaging (push) + התראות מקומיות
- **בריאות:** Health Connect / HealthKit (`health_service`) — צעדים, קלוריות
- **תזונה חיצונית:** OpenFoodFacts + data.gov.il (מאגר מזון לאומי)
- **AI:** עוזר עם streaming SSE + מערכת קרדיטים (`ai_conversation_service`, `ai_sse_service`, `ai_alternatives_service`, Edge Function `coach-ai-assistant`)
- **אחר:** affiliate, analytics, offline cache, אחסון מאובטח, חסימה/דיווח, PDF

### 3.2 מודולי האפליקציה (107 מסכים מקובצים) [שוחזר]
- **כניסה ואונבורדינג:** splash, onboarding, login, register, forgot/verify OTP, enter coach code, error
- **צד מאמן:** דשבורד/בית/יומי, רשימת+כרטיס לקוחה, הזמנת לקוחה, צ'אט והודעות, ספריית תרגילים + יצירת תרגיל, מאכלים/ספר מתכונים/בניית תוכניות תזונה, תוכניות+בניית אימון, לוג מהיר, הוספת תמונת התקדמות + השוואה, **פורטל ומיתוג מאמן** (לוגו, עמוד), פרופיל/הגדרות/העדפות/התראות, פיד פעילות
- **צד מתאמנת:** דשבורד, פרופיל/חשבון/הגדרות, ספריית תרגילים, אימונים (רשימה/פירוט/שמירה/השלמה/פוסט), **routines** (יצירה/עריכה/בורר), תוכניות, תזונה (דשבורד/עצמית/הארוחות שלי/היסטוריה/מתכונים/ספר), **סורק ברקוד**, בקשות החלפת מאכל, יומן מדידות + שקילה, **השוואות לפני/אחרי + פוזות**, explore/חיפוש/**לוח מובילים שבועי**/צ'אט עמיתים, **עוזר AI + קרדיטים**, מרכז התראות, ניהול מנוי, **דשבורד שותפים**, מציג מדיה/PDF, מדיניות/תנאים

### 3.3 State [שוחזר]
ניהול state ב-**Riverpod** (55 providers). ב-RN המקבילה: Zustand (כבר בשימוש בשלהבת) או React Query לנתוני שרת.

### 3.4 מודל הנתונים — טבלאות שזוהו [שוחזר/הוסק]
- `profiles` (avatar_url, role, coach/trainee) · `coach_client_relationships` (coach_id, client_id, created_by_coach_id, coach_deleted_at) · `coaching_requests` (approved/rejected)
- תרגילים: `exercises` / custom (custom_video_url, alternative_exercise_id), buckets: `exercise_photos`, `exercise_muscle_groups_photos`, `exercise_equipments_photos`, `custom_exercise_media`
- אימונים: `programs`/`routines`, `workouts`, `workout_logs` (sets/reps, נפח, PR, רצף שבועי)
- תזונה: `coach_meals`, `meal_programs`, `recipes`/cookbook, `saved_meals`, `consumed_foods`, `community_foods`, `alternative_food` (החלפות), יעדים יומיים (calories/protein/carbs/fats)
- גוף: `body_measurements`, `weight_history`, `progress_photos`/`poses`, `comparisons`
- תקשורת: `messages`/`chat_messages`, `ai_conversations`+`ai_messages`+`ai_credits`, `notifications`, `reminders`
- מאמן/עסקי: `coach_preferences`, `coach_page` (מיתוג), `coach_recommendations`, `subscriptions` (RevenueCat), `affiliate`
- חברתי: `social_feed`/posts, `weekly_leaderboard`, `block_report`

## 4. המצב הקיים של שלהבת [קיים]

- **Frontend:** `shalhevet-app/` — React Native + Expo 54, React 19, React Navigation, Zustand, react-native-svg, reanimated, view-shot, image-picker. פונטים Heebo+Rubik, UI כהה RTL. Bundle `com.shalhevet.mehatevet`.
- **מסכים:** Home, Login, Register, Splash, Coach, CoachDashboard, FoodDiary, Nutrition, Workout, Progress, Profile, RecipeCatalog.
- **Backend:** `backend/` — Node/Express + PostgreSQL (Railway/Neon), JWT auth.
- **סכמה קיימת:** users (coach/client + שכבת התאמה: coach_tags, habit_assignments, check_in_template, quick_message_templates, plan_template_profiles, coach_private_notes), client_goals, nutrition_plans (+pinned_menu), workout_plans, weight_history, updates, meetings, messages, workout_logs, nutrition_logs, check_in_entries, habit_logs, coach_meals.
- **יתרון ייחודי שאין ב-All-in-Fit:** שכבת התאמה אישית למאמנת — צ'ק-אין שבועי דינמי, הרגלים מותאמים, תבניות הודעה/תוכנית לפי סוג לקוחה, דגלי חוסר-תגובה. **לשמר ולהרחיב.**

## 5. ניתוח פערים — מה להוסיף לשלהבת

| מודול | שלהבת היום | All-in-Fit | פעולה |
|--------|------------|------------|--------|
| ספריית תרגילים + וידאו | ❌ | ✅ | לבנות |
| מעקב אימון (PR/נפח/רצף/טיימר) | בסיסי | ✅ מתקדם | להרחיב |
| תוכניות תזונה + החלפת מאכלים | תפריטים | ✅ meal programs | להרחיב |
| סריקת ברקוד + OpenFoodFacts/משה"ב | ❌ | ✅ | לבנות |
| מדידות גוף + תמונות + השוואות | שקילה | ✅ | לבנות |
| עוזר AI + קרדיטים | ❌ | ✅ | לבנות (Edge Function) |
| צ'אט realtime | הודעות בסיס | ✅ | להחליף ל-Supabase realtime |
| מנויים (RevenueCat) | ❌ | ✅ | לבנות |
| פורטל/מיתוג מאמן | ❌ | ✅ | לבנות |
| רשת חברתית + לוח מובילים | ❌ | ✅ | אופציונלי / שלב מאוחר |
| affiliate | ❌ | ✅ | אופציונלי |
| צ'ק-אין דינמי / הרגלים / תבניות | ✅ ייחודי | ❌ | **לשמר** |

## 6. ארכיטקטורת היעד

```
shalhevet-app (React Native + Expo)
   ├── auth: supabase-js (OTP)
   ├── data: supabase-js (PostgREST) + React Query / Zustand
   ├── realtime: Supabase Realtime (צ'אט, פיד)
   ├── storage: Supabase Storage (תמונות תרגילים, אווטארים, התקדמות)
   ├── push: expo-notifications + FCM
   ├── subscriptions: react-native-purchases (RevenueCat)
   ├── barcode: expo-camera / vision-camera + OpenFoodFacts
   └── AI: Supabase Edge Function (coach-ai-assistant, SSE)
Supabase (חדש)
   ├── Postgres (סכמה מאוחדת + RLS)
   ├── Auth · Storage · Realtime
   └── Edge Functions (AI, webhooks)
```

## 7. סכמת Supabase מאוחדת (תכנון)

בסיס = הסכמה הקיימת של שלהבת (Postgres → Supabase, המרה ישירה), מועשר בישויות מסעיף 3.4. עקרונות:
- `auth.users` של Supabase + טבלת `profiles` (1:1) במקום טבלת `users` עם סיסמאות.
- מעבר ממודל מאמן-יחיד (coach_name על המשתמש) ל-`coach_client_relationships` רב-לקוחות.
- RLS לכל טבלה: מתאמנת רואה את שלה; מאמנת רואה את הלקוחות המקושרות אליה.
- ה-DDL המלא יופק כקובץ `supabase/schema.sql` (השלב הבא).

## 8. מפת דרכים

- **שלב 0 — תשתית:** הקמת פרויקט Supabase חדש, יצירת `supabase/schema.sql` + RLS, העלאת assets ל-Storage, הוספת `@supabase/supabase-js` ל-RN.
- **שלב 1 — Auth + נתוני ליבה:** מיגרציה מ-JWT/Node ל-Supabase Auth, החלפת `src/services/api.js` ב-supabase client, פרופילים + קשרי מאמן-לקוחה.
- **שלב 2 — ליבת אימון+תזונה:** ספריית תרגילים, routines/programs, מעקב אימון, meal programs, סריקת ברקוד.
- **שלב 3 — מדידות + צ'אט realtime + התראות.**
- **שלב 4 — מנויים (RevenueCat) + פורטל מאמן + עוזר AI.**
- **שלב 5 (אופציונלי) — רשת חברתית, לוח מובילים, affiliate.**
- **רוחבי:** לשמר את שכבת ההתאמה הייחודית של שלהבת (צ'ק-אין/הרגלים/תבניות) לאורך כל הדרך.

## 9. משימות פתוחות לבעלים

1. **לנסות להחזיר בעלות על חשבון Supabase המקורי** — יפתח שחזור 1:1 + העברת המשתמשים והנתונים הקיימים.
2. חשבון RevenueCat + מוצרי מנוי ב-App Store / Google Play.
3. ספק ה-AI לעוזר (OpenAI/Anthropic) + תקציב, ל-Edge Function החדש.
4. החלטה: האם להעביר משתמשים קיימים (תלוי במשימה 1) או להתחיל נקי.
