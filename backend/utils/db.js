/**
 * utils/db.js - מסד הנתונים
 * ===========================
 * מנהל קריאה וכתיבה לקובץ db.json
 * זה כמו "מחסן" שבו שמורים כל הנתונים.
 * 
 * בגרסה עתידית: נחליף את זה ב-MongoDB או Firebase
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'db.json');

// קרא את כל מסד הנתונים
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ שגיאה בקריאת מסד נתונים:', err.message);
    return { users: [], weightHistory: [], workoutLogs: [], nutritionLogs: [], updates: [], meetings: [], messages: [] };
  }
}

// כתוב למסד הנתונים
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('❌ שגיאה בכתיבה למסד נתונים:', err.message);
    return false;
  }
}

// אתחל את מסד הנתונים - צור חשבון מאמנת אם לא קיים
async function initDB() {
  const db = readDB();

  // בדוק אם המאמנת כבר קיימת
  const coachExists = db.users.find(u => u.role === 'coach');
  
  if (!coachExists) {
    console.log('👤 יוצר חשבון מאמנת...');
    const hashedPassword = await bcrypt.hash(process.env.COACH_PASSWORD || 'Shalhevet2024!', 10);
    
    const coach = {
      id: 'coach-shalhevet',
      name: process.env.COACH_NAME || 'שלהבת מחטבת',
      email: process.env.COACH_EMAIL || 'shalhevet@gmail.com',
      phone: process.env.COACH_PHONE || '0542213199',
      password: hashedPassword,
      role: 'coach', // 'coach' = מאמנת, 'client' = לקוחה
      createdAt: new Date().toISOString(),
    };
    
    db.users.push(coach);
    writeDB(db);
    console.log('✅ חשבון מאמנת נוצר בהצלחה!');
    console.log(`   📧 אימייל: ${coach.email}`);
    console.log(`   🔑 סיסמה: ${process.env.COACH_PASSWORD || 'Shalhevet2024!'}`);
  } else {
    console.log('✅ חשבון מאמנת קיים - מוכן לעבודה!');
  }
  
  console.log(`📊 סה"כ משתמשות: ${db.users.filter(u => u.role === 'client').length}`);
}

// ─── פונקציות עזר למשתמשים ────────────────────────────────────────────────

function getAllUsers() {
  const db = readDB();
  return db.users;
}

function getUserById(id) {
  const db = readDB();
  return db.users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  const db = readDB();
  return db.users.find(u => u.email === email.toLowerCase()) || null;
}

function createUser(userData) {
  const db = readDB();
  const newUser = {
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDB(db);
  return newUser;
}

function updateUser(id, updates) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.users[idx];
}

// ─── היסטוריית משקל ──────────────────────────────────────────────────────────

function getWeightHistory(userId) {
  const db = readDB();
  return db.weightHistory.filter(w => w.userId === userId).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function addWeightEntry(userId, weight) {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  
  // מחק רשומה קיימת של היום אם יש
  db.weightHistory = db.weightHistory.filter(w => !(w.userId === userId && w.date === today));
  
  const entry = { id: Date.now().toString(), userId, weight, date: today, createdAt: new Date().toISOString() };
  db.weightHistory.push(entry);
  writeDB(db);
  return entry;
}

// ─── עדכונים שבועיים ──────────────────────────────────────────────────────────

function getUpdates(userId) {
  const db = readDB();
  return db.updates.filter(u => u.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAllUpdates() {
  const db = readDB();
  return db.updates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addUpdate(userId, text) {
  const db = readDB();
  const update = {
    id: Date.now().toString(),
    userId,
    text,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    readByCoach: false,
  };
  db.updates.push(update);
  writeDB(db);
  return update;
}

// ─── פגישות ──────────────────────────────────────────────────────────────────

function getMeetings(userId) {
  const db = readDB();
  return db.meetings.filter(m => m.userId === userId);
}

function getAllMeetings() {
  const db = readDB();
  return db.meetings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addMeeting(userId, date, notes) {
  const db = readDB();
  const meeting = {
    id: Date.now().toString(),
    userId,
    requestedDate: date,
    notes,
    status: 'ממתין לאישור',
    createdAt: new Date().toISOString(),
  };
  db.meetings.push(meeting);
  writeDB(db);
  return meeting;
}

function updateMeetingStatus(meetingId, status) {
  const db = readDB();
  const idx = db.meetings.findIndex(m => m.id === meetingId);
  if (idx === -1) return null;
  db.meetings[idx].status = status;
  db.meetings[idx].updatedAt = new Date().toISOString();
  writeDB(db);
  return db.meetings[idx];
}

// ─── הודעות ──────────────────────────────────────────────────────────────────

function getMessages(userId) {
  const db = readDB();
  return db.messages.filter(m => m.userId === userId || m.toUserId === userId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getAllMessages() {
  const db = readDB();
  return db.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addMessage(fromId, toId, text, fromRole) {
  const db = readDB();
  const message = {
    id: Date.now().toString(),
    fromId,
    toId: toId,
    userId: fromRole === 'coach' ? toId : fromId, // מזהה הלקוחה
    text,
    fromRole,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  writeDB(db);
  return message;
}

module.exports = {
  readDB, writeDB, initDB,
  getAllUsers, getUserById, getUserByEmail, createUser, updateUser,
  getWeightHistory, addWeightEntry,
  getUpdates, getAllUpdates, addUpdate,
  getMeetings, getAllMeetings, addMeeting, updateMeetingStatus,
  getMessages, getAllMessages, addMessage,
};
