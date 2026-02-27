/**
 * routes/coach.js - לוח בקרה של המאמנת שלהבת
 * ===============================================
 * GET  /api/coach/clients         - כל הלקוחות
 * GET  /api/coach/clients/:id     - פרטי לקוחה ספציפית
 * PUT  /api/coach/clients/:id     - עדכון פרטי לקוחה
 * POST /api/coach/clients         - הוספת לקוחה ידנית
 * GET  /api/coach/updates         - כל העדכונים מהלקוחות
 * GET  /api/coach/meetings        - כל בקשות הפגישות
 * PUT  /api/coach/meetings/:id    - אישור/דחיית פגישה
 * GET  /api/coach/messages        - כל ההודעות
 * POST /api/coach/messages/:userId - שלח הודעה ללקוחה
 * GET  /api/coach/stats           - סטטיסטיקות כלליות
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  getAllUsers, getUserById, createUser, updateUser,
  getWeightHistory, getAllUpdates, getAllMeetings,
  updateMeetingStatus, getAllMessages, addMessage,
  readDB,
} = require('../utils/db');
const { authenticate, requireCoach } = require('../middleware/auth');

// כל ה-routes דורשים כניסה וזכות מאמנת
router.use(authenticate);
router.use(requireCoach);

// ─── GET /api/coach/clients - כל הלקוחות ────────────────────────────────────
router.get('/clients', (req, res) => {
  const allUsers = getAllUsers();
  const clients = allUsers
    .filter(u => u.role === 'client')
    .map(({ password, ...safe }) => safe) // מסיר סיסמאות
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    count: clients.length,
    clients,
  });
});

// ─── GET /api/coach/clients/:id - פרטי לקוחה ─────────────────────────────────
router.get('/clients/:id', (req, res) => {
  const user = getUserById(req.params.id);

  if (!user || user.role !== 'client') {
    return res.status(404).json({ error: 'לקוחה לא נמצאה' });
  }

  const { password, ...safe } = user;
  const weightHistory = getWeightHistory(user.id);
  const db = readDB();
  const updates = db.updates.filter(u => u.userId === user.id);
  const meetings = db.meetings.filter(m => m.userId === user.id);
  const messages = db.messages.filter(m => m.userId === user.id);

  res.json({
    success: true,
    client: safe,
    weightHistory,
    updates,
    meetings,
    messages,
  });
});

// ─── PUT /api/coach/clients/:id - עדכון פרטי לקוחה ──────────────────────────
router.put('/clients/:id', async (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user || user.role !== 'client') {
      return res.status(404).json({ error: 'לקוחה לא נמצאה' });
    }

    const { name, phone, weight, height, age, goal, activityLevel, notes, isActive, newPassword } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (weight !== undefined) updates.weight = parseFloat(weight);
    if (height !== undefined) updates.height = parseFloat(height);
    if (age !== undefined) updates.age = parseInt(age);
    if (goal !== undefined) updates.goal = goal;
    if (activityLevel !== undefined) updates.activityLevel = activityLevel;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;

    // אפשרות לאפס סיסמה
    if (newPassword && newPassword.length >= 6) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = updateUser(req.params.id, updates);
    const { password, ...safe } = updated;

    res.json({ success: true, message: 'פרטי הלקוחה עודכנו ✅', client: safe });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון לקוחה' });
  }
});

// ─── POST /api/coach/clients - הוספת לקוחה ידנית ────────────────────────────
router.post('/clients', async (req, res) => {
  try {
    const { name, email, password, phone, weight, height, age, goal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'שם, אימייל וסיסמה הם שדות חובה' });
    }

    const existing = require('../utils/db').getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'אימייל זה כבר קיים במערכת' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = createUser({
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password: hashedPassword,
      role: 'client',
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      age: age ? parseInt(age) : null,
      goal: goal || 'חיטוב',
      activityLevel: 'מתונה',
      coachName: 'שלהבת מחטבת',
      coachPhone: '0542213199',
      isActive: true,
      notes: '',
    });

    console.log(`✅ מאמנת הוסיפה לקוחה: ${newClient.name}`);

    const { password: pw, ...safe } = newClient;
    res.status(201).json({
      success: true,
      message: `לקוחה ${newClient.name} נוספה בהצלחה! ✅`,
      client: safe,
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בהוספת לקוחה' });
  }
});

// ─── GET /api/coach/updates - עדכונים מהלקוחות ──────────────────────────────
router.get('/updates', (req, res) => {
  const allUsers = getAllUsers();
  const updates = getAllUpdates();

  // הוסף שם לקוחה לכל עדכון
  const enriched = updates.map(u => {
    const client = allUsers.find(user => user.id === u.userId);
    return { ...u, clientName: client ? client.name : 'לא ידוע' };
  });

  res.json({ success: true, updates: enriched });
});

// ─── GET /api/coach/meetings - בקשות פגישות ──────────────────────────────────
router.get('/meetings', (req, res) => {
  const allUsers = getAllUsers();
  const meetings = getAllMeetings();

  const enriched = meetings.map(m => {
    const client = allUsers.find(u => u.id === m.userId);
    return { ...m, clientName: client ? client.name : 'לא ידוע' };
  });

  res.json({ success: true, meetings: enriched });
});

// ─── PUT /api/coach/meetings/:id - אשר/דחה פגישה ────────────────────────────
router.put('/meetings/:id', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['ממתין לאישור', 'אושר', 'נדחה', 'בוטל'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }

  const meeting = updateMeetingStatus(req.params.id, status);
  if (!meeting) {
    return res.status(404).json({ error: 'פגישה לא נמצאה' });
  }

  res.json({ success: true, message: `סטטוס פגישה עודכן: ${status}`, meeting });
});

// ─── GET /api/coach/messages - כל ההודעות ────────────────────────────────────
router.get('/messages', (req, res) => {
  const allUsers = getAllUsers();
  const messages = getAllMessages();

  const enriched = messages.map(m => {
    const client = allUsers.find(u => u.id === m.userId);
    return { ...m, clientName: client ? client.name : 'לא ידוע' };
  });

  res.json({ success: true, messages: enriched });
});

// ─── POST /api/coach/messages/:userId - שלח הודעה ללקוחה ─────────────────────
router.post('/messages/:userId', async (req, res) => {
  try {
    const { text } = req.body;
    const { userId } = req.params;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: 'נא לכתוב הודעה' });
    }

    const client = getUserById(userId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ error: 'לקוחה לא נמצאה' });
    }

    const message = addMessage('coach-shalhevet', userId, text.trim(), 'coach');

    res.json({
      success: true,
      message: `ההודעה נשלחה ל${client.name}! ✅`,
      data: message,
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליחת הודעה' });
  }
});

// ─── GET /api/coach/stats - סטטיסטיקות ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const allUsers = getAllUsers();
  const db = readDB();

  const clients = allUsers.filter(u => u.role === 'client');
  const activeClients = clients.filter(u => u.isActive);
  const pendingMeetings = db.meetings.filter(m => m.status === 'ממתין לאישור');
  const unreadUpdates = db.updates.filter(u => !u.readByCoach);

  res.json({
    success: true,
    stats: {
      totalClients: clients.length,
      activeClients: activeClients.length,
      pendingMeetings: pendingMeetings.length,
      unreadUpdates: unreadUpdates.length,
      totalUpdates: db.updates.length,
      totalMeetings: db.meetings.length,
      totalMessages: db.messages.length,
    },
  });
});

module.exports = router;
