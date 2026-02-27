require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'db.json');

async function seedDB() {
  try {
    // ─── קריאת ערכים מ-.env ──────────────────────────────────
    const coachEmail    = process.env.COACH_EMAIL    || 'coach@example.com';
    const coachPassword = process.env.COACH_PASSWORD || 'CHANGE_ME_NOW';
    const coachName     = process.env.COACH_NAME     || 'המאמנת';
    const coachPhone    = process.env.COACH_PHONE    || '05X-XXXXXXX';

    if (coachPassword === 'CHANGE_ME_NOW') {
      console.warn('⚠️  לא הוגדרה COACH_PASSWORD ב-.env – משתמשת בסיסמה ברירת מחדל חלשה!');
      console.warn('   פעלי לפי ההוראות ב-.env.example');
    }

    let db = { users: [], weightHistory: [], workoutLogs: [], nutritionLogs: [], updates: [], meetings: [], messages: [] };

    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(data);
    }

    // סיסמאות – hash מה-.env, לא hardcoded!
    const coachHash  = await bcrypt.hash(coachPassword, 10);
    const clientHash = await bcrypt.hash('client-test-password', 10);

    const coach = {
      id: 'coach-shalhevet',
      name: coachName,
      email: coachEmail,
      phone: coachPhone,
      password: coachHash,
      role: 'coach',
      createdAt: new Date().toISOString()
    };

    const client = {
      id: 'test-client-1',
      name: 'לקוחה לדוגמה',
      email: 'test@client.com',
      phone: '050-0000000',
      password: clientHash,
      role: 'client',
      weight: '65',
      height: '165',
      age: '30',
      goal: 'חיטוב וירידה במשקל',
      activityLevel: 'מתונה',
      coachName: coachName,
      coachPhone: coachPhone,
      isActive: true,
      notes: 'משתמשת בדיקה לבחינת האפליקציה',
      createdAt: new Date().toISOString()
    };

    db.users = db.users.filter(u => u.email !== coachEmail && u.email !== 'test@client.com');
    db.users.push(coach);
    db.users.push(client);

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

    console.log('✅ משתמשי הבדיקה נוצרו בהצלחה!');
    console.log('מאמנת: ' + coachEmail);
    console.log('לקוחה: test@client.com');
    console.log('(הסיסמאות נשמרות רק כ-hash - לעולם לא בטקסט גלוי)');
    process.exit(0);
  } catch (err) {
    console.error('שגיאה:', err);
    process.exit(1);
  }
}

seedDB();