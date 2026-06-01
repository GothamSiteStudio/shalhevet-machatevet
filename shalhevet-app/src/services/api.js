/**
 * src/services/api.js — שכבת נתונים מבוססת Supabase
 * ===================================================
 * מחליפה את הבקאנד הקודם (Railway/Node) ב-Supabase, תוך שמירה על אותו ממשק
 * (authAPI / usersAPI / coachAPI / tokenStorage) כדי שהמסכים יעבדו ללא שינוי.
 * ממיר snake_case (עמודות Supabase) ל-camelCase (מה שהאפליקציה מצפה לו).
 *
 * הערה: צד המאמנת (coachAPI) במודל מאמנת-יחידה (שלהבת). יעודכן בהמשך לפי הצורך.
 */

import { supabase } from '../lib/supabase';

// ───────────────────────── helpers ─────────────────────────
const snakeToCamel = s => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const camelToSnake = s => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());

// ממיר רק את מפתחות הרמה העליונה (ערכי JSONB נשמרים כמו שהם)
function keysToCamel(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  return out;
}
function keysToSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[camelToSnake(k)] = v;
  return out;
}
const mapRows = rows => (rows || []).map(keysToCamel);

function mapUser(row, { includePrivate = false } = {}) {
  if (!row) return null;
  const u = keysToCamel(row);
  if (u.fullName !== undefined) {
    u.name = u.fullName;
    delete u.fullName;
  }
  if (!includePrivate) delete u.coachPrivateNotes;
  return u;
}

function mapAuthError(error) {
  const msg = (error && error.message) || 'שגיאת שרת';
  if (/invalid login credentials/i.test(msg)) return 'אימייל או סיסמה שגויים';
  if (/already registered|user already exists/i.test(msg)) return 'אימייל זה כבר רשום במערכת';
  if (/email not confirmed/i.test(msg)) return 'יש לאשר את האימייל לפני הכניסה';
  if (/password should be at least/i.test(msg)) return 'הסיסמה חייבת להיות לפחות 6 תווים';
  if (/network|fetch/i.test(msg)) return 'בעיית תקשורת. בדקי את החיבור לאינטרנט.';
  return msg;
}

function check(error) {
  if (error) throw new Error(error.message || 'שגיאת שרת');
}

const todayKey = () => new Date().toISOString().slice(0, 10);

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('אין הרשאה - נא להתחבר מחדש');
  return data.user.id;
}

async function fetchProfile(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  check(error);
  return data;
}

// ───────────────────────── AUTH ─────────────────────────
export const authAPI = {
  register: async data => {
    const { email, password, name, phone, weight, height, age, goal } = data;
    const { data: res, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || '',
          role: 'client',
          weight: weight ?? '',
          height: height ?? '',
          age: age ?? '',
          goal: goal || 'חיטוב',
        },
      },
    });
    if (error) throw new Error(mapAuthError(error));

    const userId = res.user?.id;
    let profile = null;
    if (userId) {
      try {
        profile = await fetchProfile(userId);
      } catch (_) {
        /* profile trigger may lag; fall back below */
      }
    }
    return {
      success: true,
      message: 'ברוכה הבאה! החשבון נוצר בהצלחה 🎉',
      token: res.session?.access_token || null,
      needsEmailConfirm: !res.session,
      user:
        mapUser(profile) || {
          id: userId,
          email,
          name,
          role: 'client',
          goal: goal || 'חיטוב',
        },
    };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error));
    const profile = await fetchProfile(data.user.id);
    return {
      success: true,
      message: `ברוכה הבאה, ${profile.full_name || ''}! 💪`,
      token: data.session?.access_token,
      user: mapUser(profile),
    };
  },

  me: async () => {
    const uid = await currentUserId();
    return { success: true, user: mapUser(await fetchProfile(uid)) };
  },

  // אין תשתית אימייל עדיין — מחזיר הדרכה ידנית (כמו בבקאנד הקודם)
  forgotPassword: async () => ({
    success: true,
    message: 'צרי קשר עם שלהבת בוואטסאפ: 0542213199 לאיפוס הסיסמה',
  }),
};

// ───────────────────────── USERS (לקוחה) ─────────────────────────
export const usersAPI = {
  getMe: async () => {
    const uid = await currentUserId();
    return { success: true, user: mapUser(await fetchProfile(uid)) };
  },

  getPlans: async () => {
    const uid = await currentUserId();
    const [goals, nutrition, workout] = await Promise.all([
      supabase.from('client_goals').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('nutrition_plans').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('workout_plans').select('*').eq('user_id', uid).maybeSingle(),
    ]);
    return {
      success: true,
      goals: keysToCamel(goals.data),
      nutritionPlan: keysToCamel(nutrition.data),
      workoutPlan: keysToCamel(workout.data),
    };
  },

  getGoals: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('client_goals')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    check(error);
    return { success: true, goals: keysToCamel(data) };
  },

  getNutritionPlan: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    check(error);
    return { success: true, nutritionPlan: keysToCamel(data) };
  },

  getFoodDiary: async (date, options = {}) => {
    const uid = await currentUserId();
    const day = date || todayKey();
    const { data: entry, error } = await supabase
      .from('food_diary_entries')
      .select('*')
      .eq('user_id', uid)
      .eq('entry_date', day)
      .maybeSingle();
    check(error);

    let recentEntries = [];
    if (options.includeRecent) {
      const limit = Math.max(1, Math.min(Number(options.recentLimit) || 7, 31));
      const { data: recent } = await supabase
        .from('food_diary_entries')
        .select('*')
        .eq('user_id', uid)
        .order('entry_date', { ascending: false })
        .limit(limit);
      recentEntries = mapRows(recent);
    }
    return { success: true, entry: keysToCamel(entry), recentEntries };
  },

  saveFoodDiary: async (date, data) => {
    const uid = await currentUserId();
    const meals = data?.meals && typeof data.meals === 'object' ? data.meals : data;
    const { data: entry, error } = await supabase
      .from('food_diary_entries')
      .upsert({ user_id: uid, entry_date: date, meals }, { onConflict: 'user_id,entry_date' })
      .select()
      .single();
    check(error);
    return { success: true, message: 'יומן האכילה עודכן ✅', entry: keysToCamel(entry) };
  },

  getWorkoutPlan: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    check(error);
    return { success: true, workoutPlan: keysToCamel(data) };
  },

  getHabits: async date => {
    const uid = await currentUserId();
    const day = date || todayKey();
    const profile = await fetchProfile(uid);
    const assignments = (profile.habit_assignments || []).filter(h => h && h.isActive !== false);
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id,completed')
      .eq('user_id', uid)
      .eq('log_date', day);
    const completedMap = new Map((logs || []).map(l => [l.habit_id, l.completed]));
    const habits = assignments.map(h => ({ ...h, completed: completedMap.get(h.id) === true }));
    return { success: true, date: day, habits };
  },

  updateHabit: async (habitId, date, completed) => {
    const uid = await currentUserId();
    const day = date || todayKey();
    const { error } = await supabase
      .from('habit_logs')
      .upsert(
        { user_id: uid, habit_id: habitId, log_date: day, completed: completed === true },
        { onConflict: 'user_id,habit_id,log_date' }
      );
    check(error);
    return usersAPI.getHabits(day);
  },

  getCheckIn: async weekKey => {
    const uid = await currentUserId();
    const profile = await fetchProfile(uid);
    const [entryRes, latestRes] = await Promise.all([
      weekKey
        ? supabase
            .from('check_in_entries')
            .select('*')
            .eq('user_id', uid)
            .eq('week_key', weekKey)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('check_in_entries')
        .select('*')
        .eq('user_id', uid)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      success: true,
      template: profile.check_in_template || { title: '', intro: '', questions: [] },
      entry: keysToCamel(entryRes.data),
      latestEntry: keysToCamel(latestRes.data),
    };
  },

  submitCheckIn: async (weekKey, data) => {
    const uid = await currentUserId();
    const profile = await fetchProfile(uid);
    const template = profile.check_in_template || { title: '', questions: [] };
    const { data: existing } = await supabase
      .from('check_in_entries')
      .select('id')
      .eq('user_id', uid)
      .eq('week_key', weekKey)
      .maybeSingle();
    const { data: entry, error } = await supabase
      .from('check_in_entries')
      .upsert(
        {
          user_id: uid,
          week_key: weekKey,
          template,
          answers: data?.answers || [],
          note: data?.note || '',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,week_key' }
      )
      .select()
      .single();
    check(error);

    let update = null;
    if (!existing) {
      const title = template.title || 'צ׳ק-אין שבועי';
      const res = await supabase
        .from('updates')
        .insert({ user_id: uid, text: `${title} (${weekKey})`, update_date: todayKey() })
        .select()
        .single();
      update = keysToCamel(res.data);
    }
    return {
      success: true,
      message: existing ? 'הצ׳ק-אין עודכן ✅' : 'הצ׳ק-אין נשלח ✅',
      entry: keysToCamel(entry),
      update,
    };
  },

  updateMe: async data => {
    const uid = await currentUserId();
    const allowed = ['name', 'phone', 'weight', 'height', 'age', 'goal', 'activityLevel'];
    const patch = {};
    for (const key of allowed) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        patch[key === 'name' ? 'full_name' : camelToSnake(key)] = data[key];
      }
    }
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', uid)
      .select()
      .single();
    check(error);
    return { success: true, user: mapUser(updated) };
  },

  getWeightHistory: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', uid)
      .order('entry_date', { ascending: true });
    check(error);
    return { success: true, history: mapRows(data) };
  },

  addWeight: async weight => {
    const uid = await currentUserId();
    const w = parseFloat(weight);
    const { data: entry, error } = await supabase
      .from('weight_history')
      .upsert(
        { user_id: uid, weight: w, entry_date: todayKey() },
        { onConflict: 'user_id,entry_date' }
      )
      .select()
      .single();
    check(error);
    await supabase.from('profiles').update({ weight: w }).eq('id', uid);
    return { success: true, message: `משקל עודכן: ${weight} ק"ג ✅`, entry: keysToCamel(entry) };
  },

  getUpdates: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, updates: mapRows(data) };
  },

  sendUpdate: async text => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('updates')
      .insert({ user_id: uid, text: String(text).trim(), update_date: todayKey() })
      .select()
      .single();
    check(error);
    return { success: true, message: 'העדכון נשלח לשלהבת! ✅', update: keysToCamel(data) };
  },

  getMeetings: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, meetings: mapRows(data) };
  },

  requestMeeting: async (requestedDate, notes) => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('meetings')
      .insert({ user_id: uid, requested_date: requestedDate, notes: notes || '' })
      .select()
      .single();
    check(error);
    return { success: true, message: 'בקשת הפגישה נשלחה לשלהבת! ✅', meeting: keysToCamel(data) };
  },

  getMessages: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_user_id', uid)
      .order('created_at', { ascending: true });
    check(error);
    return { success: true, messages: mapRows(data) };
  },

  sendMessage: async text => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('messages')
      .insert({ thread_user_id: uid, from_id: uid, from_role: 'client', text: String(text).trim() })
      .select()
      .single();
    check(error);
    return { success: true, message: 'ההודעה נשלחה! ✅', data: keysToCamel(data) };
  },

  changePassword: async (_currentPassword, newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(mapAuthError(error));
    return { success: true, message: 'הסיסמה עודכנה בהצלחה ✅' };
  },

  deleteAccount: async () => {
    // מחיקת חשבון מלאה דורשת service_role (צד שרת). כרגע: מסמן לא-פעיל ומנתק.
    const uid = await currentUserId();
    await supabase.from('profiles').update({ is_active: false }).eq('id', uid);
    await supabase.auth.signOut();
    return { success: true, message: 'החשבון סומן למחיקה ונותקת' };
  },
};

// ───────────────────────── COACH (מאמנת) ─────────────────────────
// מודל מאמנת-יחידה (שלהבת). ייבחן ויעודכן בעת מעבר צד המאמנת.
export const coachAPI = {
  getClients: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, clients: (data || []).map(r => mapUser(r, { includePrivate: true })) };
  },

  getClient: async id => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    check(error);
    return { success: true, client: mapUser(data, { includePrivate: true }) };
  },

  addClient: async () => {
    // יצירת לקוחה ע"י המאמנת דורשת admin (service_role). כרגע מוחזר כיוון.
    throw new Error('הוספת לקוחה ידנית תתאפשר בקרוב (דורש הגדרת צד שרת)');
  },

  updateClient: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(keysToSnake(data))
      .eq('id', id)
      .select()
      .single();
    check(error);
    return { success: true, client: mapUser(updated, { includePrivate: true }) };
  },

  sendAutomationReminder: async () => ({ success: true, message: 'תזכורת נשלחה' }),

  getClientPlans: async id => {
    const [g, n, w] = await Promise.all([
      supabase.from('client_goals').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('nutrition_plans').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('workout_plans').select('*').eq('user_id', id).maybeSingle(),
    ]);
    return {
      success: true,
      goals: keysToCamel(g.data),
      nutritionPlan: keysToCamel(n.data),
      workoutPlan: keysToCamel(w.data),
    };
  },

  getClientGoals: async id => {
    const { data, error } = await supabase
      .from('client_goals')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    check(error);
    return { success: true, goals: keysToCamel(data) };
  },

  updateClientGoals: async (id, data) => {
    const { data: row, error } = await supabase
      .from('client_goals')
      .upsert({ ...keysToSnake(data), user_id: id }, { onConflict: 'user_id' })
      .select()
      .single();
    check(error);
    return { success: true, goals: keysToCamel(row) };
  },

  getClientNutritionPlan: async id => {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    check(error);
    return { success: true, nutritionPlan: keysToCamel(data) };
  },

  updateClientNutritionPlan: async (id, data) => {
    const { data: row, error } = await supabase
      .from('nutrition_plans')
      .upsert({ ...keysToSnake(data), user_id: id }, { onConflict: 'user_id' })
      .select()
      .single();
    check(error);
    return { success: true, nutritionPlan: keysToCamel(row) };
  },

  getClientFoodDiary: async (id, date, options = {}) => {
    const day = date || todayKey();
    const { data: entry } = await supabase
      .from('food_diary_entries')
      .select('*')
      .eq('user_id', id)
      .eq('entry_date', day)
      .maybeSingle();
    let recentEntries = [];
    if (options.includeRecent !== false) {
      const limit = Math.max(1, Math.min(Number(options.recentLimit) || 7, 31));
      const { data: recent } = await supabase
        .from('food_diary_entries')
        .select('*')
        .eq('user_id', id)
        .order('entry_date', { ascending: false })
        .limit(limit);
      recentEntries = mapRows(recent);
    }
    return { success: true, entry: keysToCamel(entry), recentEntries };
  },

  updateClientFoodDiary: async (id, date, data) => {
    const meals = data?.meals && typeof data.meals === 'object' ? data.meals : data;
    const { data: entry, error } = await supabase
      .from('food_diary_entries')
      .upsert({ user_id: id, entry_date: date, meals }, { onConflict: 'user_id,entry_date' })
      .select()
      .single();
    check(error);
    return { success: true, entry: keysToCamel(entry) };
  },

  getClientWorkoutPlan: async id => {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    check(error);
    return { success: true, workoutPlan: keysToCamel(data) };
  },

  updateClientWorkoutPlan: async (id, data) => {
    const { data: row, error } = await supabase
      .from('workout_plans')
      .upsert({ ...keysToSnake(data), user_id: id }, { onConflict: 'user_id' })
      .select()
      .single();
    check(error);
    return { success: true, workoutPlan: keysToCamel(row) };
  },

  getUpdates: async () => {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, updates: mapRows(data) };
  },

  getMeetings: async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, meetings: mapRows(data) };
  },

  updateMeeting: async (id, status) => {
    const { data, error } = await supabase
      .from('meetings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    check(error);
    return { success: true, meeting: keysToCamel(data) };
  },

  getMessageTemplates: async () => {
    const uid = await currentUserId();
    const profile = await fetchProfile(uid);
    return { success: true, templates: profile.quick_message_templates || [] };
  },

  updateMessageTemplates: async templates => {
    const uid = await currentUserId();
    const { error } = await supabase
      .from('profiles')
      .update({ quick_message_templates: templates })
      .eq('id', uid);
    check(error);
    return { success: true, templates };
  },

  getPlanTemplates: async () => {
    const uid = await currentUserId();
    const profile = await fetchProfile(uid);
    return { success: true, profiles: profile.plan_template_profiles || [] };
  },

  updatePlanTemplates: async profiles => {
    const uid = await currentUserId();
    const { error } = await supabase
      .from('profiles')
      .update({ plan_template_profiles: profiles })
      .eq('id', uid);
    check(error);
    return { success: true, profiles };
  },

  getMessages: async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, messages: mapRows(data) };
  },

  getClientMessages: async userId => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_user_id', userId)
      .order('created_at', { ascending: true });
    check(error);
    return { success: true, messages: mapRows(data) };
  },

  sendMessage: async (userId, text) => {
    const coachId = await currentUserId();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_user_id: userId,
        from_id: coachId,
        to_id: userId,
        from_role: 'coach',
        text: String(text).trim(),
      })
      .select()
      .single();
    check(error);
    return { success: true, data: keysToCamel(data) };
  },

  getStats: async () => {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'client');
    return { success: true, stats: { totalClients: count || 0 } };
  },

  getMeals: async () => {
    const { data, error } = await supabase
      .from('coach_meals')
      .select('*')
      .order('created_at', { ascending: false });
    check(error);
    return { success: true, meals: mapRows(data) };
  },

  getMeal: async id => {
    const { data, error } = await supabase.from('coach_meals').select('*').eq('id', id).single();
    check(error);
    return { success: true, meal: keysToCamel(data) };
  },

  createMeal: async data => {
    const uid = await currentUserId();
    const { data: row, error } = await supabase
      .from('coach_meals')
      .insert({ ...keysToSnake(data), created_by: uid })
      .select()
      .single();
    check(error);
    return { success: true, meal: keysToCamel(row) };
  },

  updateMeal: async (id, data) => {
    const { data: row, error } = await supabase
      .from('coach_meals')
      .update(keysToSnake(data))
      .eq('id', id)
      .select()
      .single();
    check(error);
    return { success: true, meal: keysToCamel(row) };
  },

  deleteMeal: async id => {
    const { error } = await supabase.from('coach_meals').delete().eq('id', id);
    check(error);
    return { success: true };
  },
};

// ───────────────────────── token (תאימות לאחור) ─────────────────────────
// Supabase מנהל את ה-session ב-AsyncStorage לבד. נשמר לתאימות עם הקוד הקיים.
export const tokenStorage = {
  save: async () => {},
  get: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  },
  remove: async () => {
    await supabase.auth.signOut();
  },
};

// ───────────────────────── EXERCISES (All-in-Fit) ─────────────────────────
export const exercisesAPI = {
  list: async ({ search, muscle } = {}) => {
    let q = supabase.from('exercises').select('*').order('name', { ascending: true });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, error } = await q;
    check(error);
    let rows = mapRows(data);
    if (muscle && muscle !== 'all') {
      rows = rows.filter(e => Array.isArray(e.muscleGroups) && e.muscleGroups.includes(muscle));
    }
    return { success: true, exercises: rows };
  },
  get: async id => {
    const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();
    check(error);
    return { success: true, exercise: keysToCamel(data) };
  },
  create: async data => {
    const uid = await currentUserId();
    const { data: row, error } = await supabase
      .from('exercises')
      .insert({ ...keysToSnake(data), is_custom: true, created_by: uid })
      .select()
      .single();
    check(error);
    return { success: true, exercise: keysToCamel(row) };
  },
  update: async (id, data) => {
    const { data: row, error } = await supabase
      .from('exercises')
      .update(keysToSnake(data))
      .eq('id', id)
      .select()
      .single();
    check(error);
    return { success: true, exercise: keysToCamel(row) };
  },
  remove: async id => {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    check(error);
    return { success: true };
  },
};

// ───────────────────────── WORKOUTS (All-in-Fit) ─────────────────────────
function computeVolume(exercises) {
  let v = 0;
  (exercises || []).forEach(ex =>
    (ex.sets || []).forEach(s => {
      v += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    })
  );
  return v;
}

function isoWeekKey(value) {
  const date = new Date(value);
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const workoutsAPI = {
  list: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', uid)
      .order('performed_at', { ascending: false });
    check(error);
    return { success: true, sessions: mapRows(data) };
  },
  create: async data => {
    const uid = await currentUserId();
    const exercises = Array.isArray(data.exercises) ? data.exercises : [];
    const { data: row, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: uid,
        performed_at: data.performedAt || new Date().toISOString(),
        duration_seconds: data.durationSeconds || null,
        total_volume: computeVolume(exercises),
        exercises,
        notes: data.notes || '',
      })
      .select()
      .single();
    check(error);
    return { success: true, session: keysToCamel(row) };
  },
  remove: async id => {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    check(error);
    return { success: true };
  },
  stats: async () => {
    const uid = await currentUserId();
    const { data, error } = await supabase.from('workout_sessions').select('*').eq('user_id', uid);
    check(error);
    const sessions = data || [];
    const weeks = new Set(sessions.map(s => isoWeekKey(s.performed_at)));
    const thisWeek = isoWeekKey(new Date().toISOString());
    const thisWeekCount = sessions.filter(s => isoWeekKey(s.performed_at) === thisWeek).length;
    let streak = 0;
    const cursor = new Date();
    for (let guard = 0; guard < 520; guard += 1) {
      if (weeks.has(isoWeekKey(cursor.toISOString()))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 7);
      } else {
        break;
      }
    }
    const totalVolume = sessions.reduce((sum, s) => sum + (Number(s.total_volume) || 0), 0);
    const prMap = {};
    sessions.forEach(s =>
      (s.exercises || []).forEach(ex => {
        const name = ex.name || 'תרגיל';
        (ex.sets || []).forEach(set => {
          const w = Number(set.weight) || 0;
          if (w > 0 && (!prMap[name] || w > prMap[name])) prMap[name] = w;
        });
      })
    );
    const prs = Object.entries(prMap)
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight);
    return {
      success: true,
      stats: { sessionsCount: sessions.length, thisWeekCount, streak, totalVolume, prs },
    };
  },
};
