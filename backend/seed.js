require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "db.json");

async function seedDB() {
  try {
    // ─── קריאת ערכים מ-.env ──────────────────────────────────
    const coachEmail = process.env.COACH_EMAIL || "coach@example.com";
    const coachPassword = process.env.COACH_PASSWORD || "CHANGE_ME_NOW";
    const coachName = process.env.COACH_NAME || "המאמנת";
    const coachPhone = process.env.COACH_PHONE || "05X-XXXXXXX";

    if (coachPassword === "CHANGE_ME_NOW") {
      console.warn(
        "⚠️  לא הוגדרה COACH_PASSWORD ב-.env – משתמשת בסיסמה ברירת מחדל חלשה!",
      );
      console.warn("   פעלי לפי ההוראות ב-.env.example");
    }

    let db = {
      users: [],
      weightHistory: [],
      workoutLogs: [],
      nutritionLogs: [],
      updates: [],
      meetings: [],
      messages: [],
      clientGoals: [],
      nutritionPlans: [],
      workoutPlans: [],
    };

    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      db = JSON.parse(data);
    }

    db.clientGoals = Array.isArray(db.clientGoals) ? db.clientGoals : [];
    db.nutritionPlans = Array.isArray(db.nutritionPlans)
      ? db.nutritionPlans
      : [];
    db.workoutPlans = Array.isArray(db.workoutPlans) ? db.workoutPlans : [];

    // סיסמאות – hash מה-.env, לא hardcoded!
    const coachHash = await bcrypt.hash(coachPassword, 10);
    const clientHash = await bcrypt.hash("client-test-password", 10);

    const coach = {
      id: "coach-shalhevet",
      name: coachName,
      email: coachEmail,
      phone: coachPhone,
      password: coachHash,
      role: "coach",
      createdAt: new Date().toISOString(),
    };

    const client = {
      id: "test-client-1",
      name: "לקוחה לדוגמה",
      email: "test@client.com",
      phone: "050-0000000",
      password: clientHash,
      role: "client",
      weight: "65",
      height: "165",
      age: "30",
      goal: "חיטוב וירידה במשקל",
      activityLevel: "מתונה",
      coachName: coachName,
      coachPhone: coachPhone,
      isActive: true,
      notes: "משתמשת בדיקה לבחינת האפליקציה",
      createdAt: new Date().toISOString(),
    };

    db.users = db.users.filter(
      (u) => u.email !== coachEmail && u.email !== "test@client.com",
    );
    db.users.push(coach);
    db.users.push(client);

    const now = new Date().toISOString();

    db.clientGoals = db.clientGoals.filter(
      (entry) => entry.userId !== client.id,
    );
    db.nutritionPlans = db.nutritionPlans.filter(
      (entry) => entry.userId !== client.id,
    );
    db.workoutPlans = db.workoutPlans.filter(
      (entry) => entry.userId !== client.id,
    );

    db.clientGoals.push({
      id: "goal-test-client-1",
      userId: client.id,
      weightGoalKg: 60,
      weeklyWorkoutTarget: 4,
      dailyStepsTarget: 10000,
      dailyWaterTargetLiters: 2.5,
      calorieTarget: 1700,
      proteinTarget: 120,
      targetDate: "2026-06-01",
      notes: "מיקוד: ירידה בשומן תוך שמירה על מסת שריר.",
      updatedBy: coach.id,
      createdAt: now,
      updatedAt: now,
    });

    db.nutritionPlans.push({
      id: "nutrition-plan-test-client-1",
      userId: client.id,
      title: "תפריט חיטוב בסיסי",
      notes: "להקפיד על חלבון בכל ארוחה ולשתות מים לאורך היום.",
      dailyTargets: {
        calories: 1700,
        protein: 120,
        carbs: 150,
        fat: 55,
        waterLiters: 2.5,
      },
      pinnedMenu: {
        title: "תפריט חיטוב אישי",
        periodLabel: "תפריט יומי",
        bodyText:
          "שתייה\n2.5 ליטר מים לאורך היום\n\nיעדים יומיים\n1700 קלוריות / חלבון 120ג׳ / פחמימות 150ג׳ / שומן 55ג׳\n\nארוחת בוקר · 08:00\nיוגורט חלבון / 1 גביע\nפירות יער / חצי כוס\n\nארוחת צהריים · 13:30\nחזה עוף / 180 גרם\nאורז מלא / כוס מבושלת\n\nדגשים\nלהתכונן מראש עם חלבון זמין ונשנוש מסודר.",
        mode: "auto",
        updatedAt: now,
      },
      meals: [
        {
          id: "meal-1",
          name: "ארוחת בוקר",
          time: "08:00",
          notes: "",
          items: [
            {
              id: "meal-item-1-1",
              name: "יוגורט חלבון",
              amount: "1 גביע",
              calories: 140,
              protein: 20,
              carbs: 8,
              fat: 2,
              notes: "",
            },
            {
              id: "meal-item-1-2",
              name: "פירות יער",
              amount: "חצי כוס",
              calories: 40,
              protein: 1,
              carbs: 9,
              fat: 0,
              notes: "",
            },
          ],
        },
        {
          id: "meal-2",
          name: "ארוחת צהריים",
          time: "13:30",
          notes: "",
          items: [
            {
              id: "meal-item-2-1",
              name: "חזה עוף",
              amount: "180 גרם",
              calories: 300,
              protein: 42,
              carbs: 0,
              fat: 8,
              notes: "",
            },
            {
              id: "meal-item-2-2",
              name: "אורז מלא",
              amount: "כוס מבושלת",
              calories: 215,
              protein: 5,
              carbs: 45,
              fat: 2,
              notes: "",
            },
            {
              id: "meal-item-2-3",
              name: "סלט ירקות",
              amount: "קערה",
              calories: 80,
              protein: 2,
              carbs: 10,
              fat: 3,
              notes: "",
            },
          ],
        },
      ],
      updatedBy: coach.id,
      createdAt: now,
      updatedAt: now,
    });

    db.workoutPlans.push({
      id: "workout-plan-test-client-1",
      userId: client.id,
      title: "תוכנית חיטוב A/B",
      goalFocus: "חיטוב וירידה במשקל",
      notes: "מנוחה של יום בין ימי כוח. בסיום כל אימון 20 דקות הליכה מהירה.",
      weeklyTargets: {
        workouts: 4,
        cardioMinutes: 80,
        steps: 10000,
      },
      days: [
        {
          id: "day-1",
          name: "יום A - פלג גוף תחתון",
          focus: "רגליים וישבן",
          notes: "",
          exercises: [
            {
              id: "exercise-1-1",
              order: 1,
              name: "סקוואט",
              externalExerciseId: "",
              mediaUrl: "",
              sets: 4,
              reps: 12,
              restSeconds: 90,
              durationSeconds: null,
              notes: "לשמור על גב ניטרלי.",
            },
            {
              id: "exercise-1-2",
              order: 2,
              name: "לאנג׳ים בהליכה",
              externalExerciseId: "",
              mediaUrl: "",
              sets: 3,
              reps: 10,
              restSeconds: 75,
              durationSeconds: null,
              notes: "10 לכל רגל.",
            },
          ],
        },
        {
          id: "day-2",
          name: "יום B - פלג גוף עליון",
          focus: "גב, חזה וכתפיים",
          notes: "",
          exercises: [
            {
              id: "exercise-2-1",
              order: 1,
              name: "חתירה בפולי",
              externalExerciseId: "",
              mediaUrl: "",
              sets: 4,
              reps: 12,
              restSeconds: 75,
              durationSeconds: null,
              notes: "",
            },
            {
              id: "exercise-2-2",
              order: 2,
              name: "לחיצת חזה במכונה",
              externalExerciseId: "",
              mediaUrl: "",
              sets: 3,
              reps: 12,
              restSeconds: 75,
              durationSeconds: null,
              notes: "",
            },
          ],
        },
      ],
      updatedBy: coach.id,
      createdAt: now,
      updatedAt: now,
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

    console.log("✅ משתמשי הבדיקה נוצרו בהצלחה!");
    console.log("מאמנת: " + coachEmail);
    console.log("לקוחה: test@client.com");
    console.log("(הסיסמאות נשמרות רק כ-hash - לעולם לא בטקסט גלוי)");
    process.exit(0);
  } catch (err) {
    console.error("שגיאה:", err);
    process.exit(1);
  }
}

seedDB();
