import { create } from 'zustand';

const DEFAULT_USER = {
  name: 'שלהבת',
  email: '',
  code: 'SHL001',
  weight: 53.0,
  height: 165,
  age: 28,
  goal: 'חיטוב',
  activityLevel: 'מתונה',
  coachName: 'שלהבת מחטבת',
  coachPhone: '0542213199',
};

const useStore = create((set, get) => ({
  // ─── AUTH ───────────────────────────────────────────────
  isLoggedIn: false,
  user: { ...DEFAULT_USER },
  login: userData => set({ isLoggedIn: true, user: { ...DEFAULT_USER, ...userData } }),
  logout: () => set({ isLoggedIn: false, user: { ...DEFAULT_USER } }),
  updateUser: data => set({ user: { ...get().user, ...data } }),

  // ─── WEIGHT HISTORY ──────────────────────────────────────
  weightHistory: [
    { date: '2026-01-01', weight: 56.0 },
    { date: '2026-01-15', weight: 55.2 },
    { date: '2026-02-01', weight: 54.5 },
    { date: '2026-02-10', weight: 53.8 },
    { date: '2026-02-20', weight: 53.0 },
  ],
  addWeight: weight => {
    const today = new Date().toISOString().split('T')[0];
    const history = [...get().weightHistory];
    const idx = history.findIndex(e => e.date === today);
    if (idx >= 0) history[idx] = { date: today, weight };
    else history.push({ date: today, weight });
    set({ weightHistory: history, user: { ...get().user, weight } });
  },

  // ─── WORKOUT TRACKER ────────────────────────────────────
  // workoutDays: { 'YYYY-WW': [false, false, false, false, false, false, false] }
  workoutWeeks: {},
  aerobicMinutes: 0,
  dailySteps: 7266,
  dailyDistance: 0,
  dailyFloors: 0,
  dailyCalories: 0,
  toggleWorkoutDay: (weekKey, dayIndex) => {
    const weeks = { ...get().workoutWeeks };
    if (!weeks[weekKey]) weeks[weekKey] = [false, false, false, false, false, false, false];
    weeks[weekKey] = weeks[weekKey].map((v, i) => (i === dayIndex ? !v : v));
    set({ workoutWeeks: weeks });
  },
  setAerobicMinutes: min => set({ aerobicMinutes: Math.max(0, min) }),
  updateDailyData: (steps, distance, floors, calories) =>
    set({
      dailySteps: steps,
      dailyDistance: distance,
      dailyFloors: floors,
      dailyCalories: calories,
    }),

  // ─── ACTIVITY HISTORY (for heatmap) ──────────────────────
  activityHistory: {},
  markActivity: (date, type) => {
    const history = { ...get().activityHistory };
    if (!history[date]) history[date] = [];
    if (!history[date].includes(type)) history[date].push(type);
    set({ activityHistory: history });
  },

  // ─── STEPS HISTORY ───────────────────────────────────────
  stepsHistory: [
    { date: '02/19', steps: 9200 },
    { date: '02/20', steps: 12291 },
    { date: '02/21', steps: 7500 },
    { date: '02/22', steps: 8100 },
    { date: '02/23', steps: 6800 },
    { date: '02/24', steps: 9400 },
    { date: '02/25', steps: 7266 },
  ],

  // ─── BODY MEASUREMENTS ──────────────────────────────────
  measurements: [],
  addMeasurement: data =>
    set({ measurements: [...get().measurements, { ...data, date: new Date().toISOString() }] }),

  // ─── FOOD DIARY (יומן אכילה) ──────────────────────────
  // foodDiary: { 'YYYY-MM-DD': { breakfast: [...], lunch: [...], dinner: [...], snacks: [...] } }
  foodDiary: {},
  getFoodDiaryByDate: dateKey => {
    const diary = get().foodDiary;
    if (diary[dateKey]) return diary[dateKey];
    return { breakfast: [], lunch: [], dinner: [], snacks: [] };
  },
  addFoodDiaryItem: (dateKey, mealType, item) => {
    const diary = { ...get().foodDiary };
    if (!diary[dateKey]) diary[dateKey] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    diary[dateKey] = {
      ...diary[dateKey],
      [mealType]: [
        ...diary[dateKey][mealType],
        { ...item, id: `fd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ],
    };
    set({ foodDiary: diary });
  },
  removeFoodDiaryItem: (dateKey, mealType, itemId) => {
    const diary = { ...get().foodDiary };
    if (!diary[dateKey]) return;
    diary[dateKey] = {
      ...diary[dateKey],
      [mealType]: diary[dateKey][mealType].filter(i => i.id !== itemId),
    };
    set({ foodDiary: diary });
  },
  getDiaryDayTotals: dateKey => {
    const day = get().getFoodDiaryByDate(dateKey);
    const allItems = [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snacks];
    return {
      calories: allItems.reduce((s, i) => s + (i.calories || 0), 0),
      protein: allItems.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: allItems.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: allItems.reduce((s, i) => s + (i.fat || 0), 0),
    };
  },

  // ─── NUTRITION ──────────────────────────────────────────
  nutritionBudget: { protein: 5.0, carbs: 4.0, fat: 2.0, total: 12.0 },
  nutritionDays: {},
  waterIntake: 0, // in liters
  waterGoal: 2.5,
  setWaterIntake: liters => set({ waterIntake: Math.max(0, Math.min(liters, get().waterGoal)) }),
  setWaterGoal: liters =>
    set(state => {
      const nextGoal = Math.max(0, Number(liters) || 0);
      return {
        waterGoal: nextGoal,
        waterIntake: Math.min(state.waterIntake, nextGoal),
      };
    }),

  getMealsByDate: dateKey => {
    const days = get().nutritionDays;
    if (days[dateKey]) return days[dateKey];
    return {
      breakfast: {
        name: 'ארוחת בוקר',
        maxPoints: 2.4,
        items: [
          {
            name: 'מעדן חלבון 0%',
            portion: '1 מעדן שלם (100 גרם)',
            protein: 1.3,
            carbs: 0,
            fat: 0,
          },
          {
            name: 'סלט ירקות - 4 ירקות',
            portion: '1 מנה שלמה (450 גרם)',
            protein: 0,
            carbs: 1.1,
            fat: 0,
          },
        ],
      },
      snack: {
        name: 'ארוחת ביניים',
        maxPoints: 0.9,
        items: [
          {
            name: 'תפוח עץ עם קליפה (ללא ליבה)',
            portion: '1 יחידה בינונית (180 גרם)',
            protein: 0,
            carbs: 0.9,
            fat: 0,
          },
        ],
      },
      lunch: {
        name: 'ארוחת צהריים',
        maxPoints: 3.6,
        items: [
          { name: 'חזה עוף', portion: '200 גרם', protein: 3.2, carbs: 0, fat: 0.4 },
          { name: 'אורז מלא', portion: '150 גרם', protein: 0, carbs: 2.0, fat: 0 },
        ],
      },
      dinner: {
        name: 'ארוחת ערב',
        maxPoints: 3.2,
        items: [
          { name: 'סלמון', portion: '150 גרם', protein: 2.5, carbs: 0, fat: 1.5 },
          { name: 'ירקות מאודים', portion: '200 גרם', protein: 0, carbs: 0.5, fat: 0 },
        ],
      },
    };
  },

  addMealItem: (dateKey, mealType, item) => {
    const days = { ...get().nutritionDays };
    if (!days[dateKey]) days[dateKey] = get().getMealsByDate(dateKey);
    days[dateKey][mealType].items.push(item);
    set({ nutritionDays: days });
  },

  // ─── COACH / UPDATES ────────────────────────────────────
  coachingDaysLeft: -1, // -1 = infinite
  previousUpdates: [
    { date: '2026-02-01', summary: 'ירדתי 0.8 ק"ג, ביצעתי 4 אימונים, שתיתי 2 ליטר ביום' },
    { date: '2026-02-15', summary: 'ירדתי 0.5 ק"ג, ביצעתי 3 אימונים, קצת קשה עם התזונה בסוף שבוע' },
  ],
  meetings: [],
  requestMeeting: (date, notes) =>
    set({ meetings: [...get().meetings, { date, notes, status: 'ממתין לאישור' }] }),
  sendUpdate: text => {
    const update = { date: new Date().toISOString().split('T')[0], summary: text };
    set({ previousUpdates: [update, ...get().previousUpdates] });
  },

  // ─── NOTIFICATIONS ───────────────────────────────────────
  notificationLevel: 'all', // 'all' | 'important' | 'none'
  setNotificationLevel: level => set({ notificationLevel: level }),

  // ─── LANGUAGE ────────────────────────────────────────────
  language: 'he',
  setLanguage: lang => set({ language: lang }),
}));

export default useStore;
