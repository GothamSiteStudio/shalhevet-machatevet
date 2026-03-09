/**
 * src/services/api.js - שירות API
 * ==================================
 * כל הקריאות לשרת עוברות דרך קובץ זה.
 *
 * אם רוצים לשנות את כתובת השרת - צריך לשנות רק כאן!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

// ─── כתובת השרת ───────────────────────────────────────────────────────────────
// הכתובת נקבעת אוטומטית לפי הגדרות src/config.js
// כדי לשנות: פתח את src/config.js ושנה את משתנה ENV
const BASE_URL = config.API_URL;

// ─── פונקציה כללית לשליחת בקשות ─────────────────────────────────────────────
async function apiRequest(method, endpoint, body = null, requiresAuth = true) {
  try {
    const headers = { 'Content-Type': 'application/json' };

    // הוסף טוקן אם נדרש
    if (requiresAuth) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'שגיאת שרת');
    }

    return data;
  } catch (err) {
    if (err.message === 'Network request failed') {
      throw new Error('לא ניתן להתחבר לשרת. בדקי שהשרת פועל וה-WiFi מחובר.');
    }
    throw err;
  }
}

// ─── AUTH API ────────────────────────────────────────────────────────────────

export const authAPI = {
  // הרשמה
  register: data => apiRequest('POST', '/auth/register', data, false),

  // כניסה
  login: (email, password) => apiRequest('POST', '/auth/login', { email, password }, false),

  // מי אני?
  me: () => apiRequest('GET', '/auth/me'),

  // שכחתי סיסמה
  forgotPassword: email => apiRequest('POST', '/auth/forgot-password', { email }, false),
};

// ─── USERS API ───────────────────────────────────────────────────────────────

export const usersAPI = {
  // פרטי משתמשת
  getMe: () => apiRequest('GET', '/users/me'),

  // יעדים ותוכניות
  getPlans: () => apiRequest('GET', '/users/plans'),
  getGoals: () => apiRequest('GET', '/users/goals'),
  getNutritionPlan: () => apiRequest('GET', '/users/nutrition-plan'),
  getWorkoutPlan: () => apiRequest('GET', '/users/workout-plan'),

  // עדכון פרטים
  updateMe: data => apiRequest('PUT', '/users/me', data),

  // משקל
  getWeightHistory: () => apiRequest('GET', '/users/weight'),
  addWeight: weight => apiRequest('POST', '/users/weight', { weight }),

  // עדכונים למאמנת
  getUpdates: () => apiRequest('GET', '/users/updates'),
  sendUpdate: text => apiRequest('POST', '/users/updates', { text }),

  // פגישות
  getMeetings: () => apiRequest('GET', '/users/meetings'),
  requestMeeting: (requestedDate, notes) =>
    apiRequest('POST', '/users/meetings', { requestedDate, notes }),

  // הודעות
  getMessages: () => apiRequest('GET', '/users/messages'),
  sendMessage: text => apiRequest('POST', '/users/messages', { text }),

  // שינוי סיסמה
  changePassword: (currentPassword, newPassword) =>
    apiRequest('PUT', '/users/password', { currentPassword, newPassword }),
};

// ─── COACH API ───────────────────────────────────────────────────────────────

export const coachAPI = {
  // לקוחות
  getClients: () => apiRequest('GET', '/coach/clients'),
  getClient: id => apiRequest('GET', `/coach/clients/${id}`),
  getClientPlans: id => apiRequest('GET', `/coach/clients/${id}/plans`),
  updateClient: (id, data) => apiRequest('PUT', `/coach/clients/${id}`, data),
  addClient: data => apiRequest('POST', '/coach/clients', data),

  // יעדים ותוכניות ללקוחה
  getClientGoals: id => apiRequest('GET', `/coach/clients/${id}/goals`),
  updateClientGoals: (id, data) => apiRequest('PUT', `/coach/clients/${id}/goals`, data),
  getClientNutritionPlan: id => apiRequest('GET', `/coach/clients/${id}/nutrition-plan`),
  updateClientNutritionPlan: (id, data) =>
    apiRequest('PUT', `/coach/clients/${id}/nutrition-plan`, data),
  getClientWorkoutPlan: id => apiRequest('GET', `/coach/clients/${id}/workout-plan`),
  updateClientWorkoutPlan: (id, data) =>
    apiRequest('PUT', `/coach/clients/${id}/workout-plan`, data),

  // עדכונים
  getUpdates: () => apiRequest('GET', '/coach/updates'),

  // פגישות
  getMeetings: () => apiRequest('GET', '/coach/meetings'),
  updateMeeting: (id, status) => apiRequest('PUT', `/coach/meetings/${id}`, { status }),

  // הודעות
  getMessages: () => apiRequest('GET', '/coach/messages'),
  sendMessage: (userId, text) => apiRequest('POST', `/coach/messages/${userId}`, { text }),

  // סטטיסטיקות
  getStats: () => apiRequest('GET', '/coach/stats'),
};

// ─── שמירת/מחיקת טוקן ───────────────────────────────────────────────────────

export const tokenStorage = {
  save: token => AsyncStorage.setItem('auth_token', token),
  get: () => AsyncStorage.getItem('auth_token'),
  remove: () => AsyncStorage.removeItem('auth_token'),
};
