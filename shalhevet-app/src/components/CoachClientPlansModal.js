import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import DismissKeyboardView from './ui/DismissKeyboardView';
import { COLORS } from '../theme/colors';
import { coachAPI } from '../services/api';
import { RECIPE_CATALOG, createNutritionMealFromRecipe } from '../data/recipeCatalog';
import {
  FOOD_DIARY_MEAL_TYPES,
  getFoodDiaryDateKey,
  getFoodDiaryMealLabel,
  normalizeFoodDiaryEntry,
} from '../utils/foodDiary';
import {
  buildAutomaticPinnedMenuFromNutrition,
  createEmptyPinnedMenu,
  hasPinnedMenuContent,
  normalizePinnedMenu,
  serializePinnedMenu,
} from '../utils/pinnedMenu';
import CoachFoodDiaryEditorModal from './CoachFoodDiaryEditorModal';
import PinnedMenuCard, { PINNED_MENU_TEMPLATE_ASPECT_RATIO } from './PinnedMenuCard';
import { KEYBOARD_AVOIDING_BEHAVIOR, KEYBOARD_DISMISS_MODE } from '../utils/keyboard';

const TABS = [
  { id: 'account', label: 'חשבון', icon: 'key-outline' },
  { id: 'goals', label: 'יעדים', icon: 'flag-outline' },
  { id: 'nutrition', label: 'תזונה', icon: 'restaurant-outline' },
  { id: 'workout', label: 'אימונים', icon: 'barbell-outline' },
  { id: 'habits', label: 'הרגלים', icon: 'checkbox-outline' },
  { id: 'checkin', label: 'צ׳ק-אין', icon: 'clipboard-outline' },
];

const HABIT_FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'יומי' },
  { id: 'weekly', label: 'שבועי' },
];

const CHECK_IN_QUESTION_TYPES = [
  { id: 'shortText', label: 'טקסט קצר' },
  { id: 'longText', label: 'טקסט ארוך' },
  { id: 'number', label: 'מספר' },
  { id: 'yesNo', label: 'כן / לא' },
  { id: 'scale', label: 'דירוג 1-5' },
];

const RECIPE_CATEGORY_ALL = 'הכל';
const RECIPE_CATEGORIES = [
  RECIPE_CATEGORY_ALL,
  ...Array.from(new Set(RECIPE_CATALOG.map(recipe => recipe.category))),
];
const PINNED_MENU_EXPORT_WIDTH = 360;
const PINNED_MENU_EXPORT_HEIGHT = Math.round(
  PINNED_MENU_EXPORT_WIDTH / PINNED_MENU_TEMPLATE_ASPECT_RATIO
);
const PINNED_MENU_MODAL_PREVIEW_HEIGHT = 480;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatAutomationDate(value) {
  if (!value) return '—';
  return String(value).split('T')[0] || '—';
}

function formatAutomationDaysAgo(days) {
  if (days === null || days === undefined) return '—';
  if (days <= 0) return 'היום';
  if (days === 1) return 'לפני יום';
  return `לפני ${days} ימים`;
}

function getAutomationMeta(level) {
  switch (level) {
    case 'urgent':
      return {
        label: 'דורשת טיפול דחוף',
        color: COLORS.danger,
        backgroundColor: '#B71C1C22',
        borderColor: '#B71C1C44',
        icon: 'alert-circle-outline',
      };
    case 'follow_up':
      return {
        label: 'נדרשת תזכורת',
        color: COLORS.warning,
        backgroundColor: '#E6510022',
        borderColor: '#E6510044',
        icon: 'flash-outline',
      };
    case 'monitor':
      return {
        label: 'במעקב',
        color: COLORS.info,
        backgroundColor: '#1565C022',
        borderColor: '#1565C044',
        icon: 'eye-outline',
      };
    default:
      return {
        label: 'במסלול',
        color: COLORS.success,
        backgroundColor: '#2E7D3222',
        borderColor: '#2E7D3244',
        icon: 'checkmark-circle-outline',
      };
  }
}

function toInputValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function createEmptyGoalsForm() {
  return {
    weightGoalKg: '',
    weeklyWorkoutTarget: '',
    dailyStepsTarget: '',
    dailyWaterTargetLiters: '',
    calorieTarget: '',
    proteinTarget: '',
    targetDate: '',
    notes: '',
  };
}

function createEmptyAccountForm() {
  return {
    name: '',
    email: '',
    phone: '',
    weight: '',
    height: '',
    age: '',
    goal: '',
    activityLevel: '',
    clientType: '',
    notes: '',
    coachStatus: '',
    coachTagsText: '',
    newPassword: '',
    confirmNewPassword: '',
    isActive: true,
  };
}

const DEFAULT_QUICK_MESSAGE_TEMPLATES = [
  {
    title: 'בדיקת דופק',
    text: 'היי {{firstName}}, רק בודקת מה שלומך היום ואם יש משהו שצריך לדייק או להתאים.',
  },
  {
    title: 'תזכורת צ׳ק-אין',
    text: 'היי {{firstName}}, עוד לא קיבלתי ממך את הצ׳ק-אין השבועי. כשתוכלי שלחי לי ואעבור עליו יחד איתך.',
  },
  {
    title: 'חיזוק חיובי',
    text: 'אלופה {{firstName}}, ראיתי את ההשקעה שלך ואני רוצה לחזק אותך. תמשיכי כך ואני כאן לכל דיוק שצריך.',
  },
  {
    title: 'תזכורת הרגלים',
    text: 'היי {{firstName}}, רק תזכורת קטנה לסמן את ההרגלים שלך היום. אם משהו נתקע, כתבי לי ונפשט את זה יחד.',
  },
];

function getClientFirstName(client) {
  return (
    String(client?.name || '')
      .trim()
      .split(/\s+/)[0] || 'יקרה'
  );
}

function createEmptyQuickMessageTemplate() {
  return {
    id: makeId('quick-message-template'),
    title: '',
    text: '',
  };
}

function createSeedQuickMessageTemplates() {
  return DEFAULT_QUICK_MESSAGE_TEMPLATES.map(template => ({
    id: makeId('quick-message-template'),
    title: template.title,
    text: template.text,
  }));
}

function normalizeClientTypeLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeClientTypeKey(value) {
  return normalizeClientTypeLabel(value).toLowerCase();
}

function hasMeaningfulValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasNutritionTemplateContent(plan) {
  if (!plan) return false;

  return Boolean(
    plan.title.trim() ||
    plan.notes.trim() ||
    plan.meals.length > 0 ||
    hasPinnedMenuContent(plan.pinnedMenu) ||
    Object.values(plan.dailyTargets || {}).some(hasMeaningfulValue)
  );
}

function hasWorkoutTemplateContent(plan) {
  if (!plan) return false;

  return Boolean(
    plan.title.trim() ||
    plan.goalFocus.trim() ||
    plan.notes.trim() ||
    plan.days.length > 0 ||
    Object.values(plan.weeklyTargets || {}).some(hasMeaningfulValue)
  );
}

function findPlanTemplateProfile(profiles, clientType) {
  const typeKey = normalizeClientTypeKey(clientType);

  if (!typeKey || !Array.isArray(profiles)) {
    return null;
  }

  return (
    profiles.find(
      profile => normalizeClientTypeKey(profile?.typeLabel || profile?.typeKey) === typeKey
    ) || null
  );
}

function upsertPlanTemplateProfile(profiles, clientType, patch) {
  const typeLabel = normalizeClientTypeLabel(clientType);
  const typeKey = normalizeClientTypeKey(typeLabel);
  const nextProfiles = Array.isArray(profiles) ? [...profiles] : [];
  const index = nextProfiles.findIndex(
    profile => normalizeClientTypeKey(profile?.typeLabel || profile?.typeKey) === typeKey
  );

  const currentProfile =
    index >= 0
      ? nextProfiles[index]
      : {
          id: makeId('plan-template-profile'),
          typeLabel,
          typeKey,
          nutritionTemplate: null,
          workoutTemplate: null,
        };

  const nextProfile = {
    ...currentProfile,
    ...patch,
    typeLabel,
    typeKey,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };

  if (index >= 0) {
    nextProfiles[index] = nextProfile;
  } else {
    nextProfiles.push(nextProfile);
  }

  return nextProfiles;
}

function formatPlanTemplateDate(value) {
  if (!value) return '—';
  return String(value).split('T')[0] || '—';
}

function getNutritionTemplateSummary(template) {
  if (!template) {
    return 'עדיין לא נשמרה תבנית תזונה לסוג הלקוחה הזה.';
  }

  const mealCount = Array.isArray(template.meals) ? template.meals.length : 0;
  const calorieTarget = hasMeaningfulValue(template.dailyTargets?.calories)
    ? `${template.dailyTargets.calories} קל׳`
    : 'ללא יעד קלורי';
  const pinnedMenuSummary = hasPinnedMenuContent(template.pinnedMenu) ? 'תפריט נעוץ מוכן' : '';

  return [template.title || 'תוכנית תזונה', `${mealCount} ארוחות`, calorieTarget, pinnedMenuSummary]
    .filter(Boolean)
    .join(' · ');
}

function getWorkoutTemplateSummary(template) {
  if (!template) {
    return 'עדיין לא נשמרה תבנית אימון לסוג הלקוחה הזה.';
  }

  const dayCount = Array.isArray(template.days) ? template.days.length : 0;
  const weeklyTarget = hasMeaningfulValue(template.weeklyTargets?.workouts)
    ? `${template.weeklyTargets.workouts} אימונים בשבוע`
    : 'ללא יעד שבועי';

  return `${template.title || 'תוכנית אימון'} · ${dayCount} ימי אימון · ${weeklyTarget}`;
}

function createEmptyHabit() {
  return {
    id: makeId('habit'),
    title: '',
    frequency: 'daily',
    targetCount: '1',
    notes: '',
    isActive: true,
  };
}

function createEmptyCheckInQuestion() {
  return {
    id: makeId('check-in-question'),
    label: '',
    type: 'shortText',
    placeholder: '',
    helperText: '',
    required: true,
  };
}

function createEmptyCheckInTemplateForm() {
  return {
    title: '',
    intro: '',
    questions: [],
  };
}

function createEmptyMealItem() {
  return {
    id: makeId('meal-item'),
    name: '',
    amount: '',
    imageUrl: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: '',
  };
}

function createEmptyMeal() {
  return {
    id: makeId('meal'),
    name: '',
    time: '',
    notes: '',
    items: [],
  };
}

function createEmptyNutritionForm() {
  return {
    title: '',
    notes: '',
    dailyTargets: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      waterLiters: '',
    },
    pinnedMenu: createEmptyPinnedMenu(),
    meals: [],
  };
}

function isValidHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());
}

function createEmptyExercise() {
  return {
    id: makeId('exercise'),
    name: '',
    externalExerciseId: '',
    mediaUrl: '',
    sets: '',
    reps: '',
    restSeconds: '',
    durationSeconds: '',
    notes: '',
  };
}

function createEmptyWorkoutDay() {
  return {
    id: makeId('day'),
    name: '',
    focus: '',
    notes: '',
    exercises: [],
  };
}

function createEmptyWorkoutForm() {
  return {
    title: '',
    goalFocus: '',
    notes: '',
    weeklyTargets: {
      workouts: '',
      cardioMinutes: '',
      steps: '',
    },
    days: [],
  };
}

function mapGoalsToForm(goals) {
  const empty = createEmptyGoalsForm();

  if (!goals) return empty;

  return {
    weightGoalKg: toInputValue(goals.weightGoalKg),
    weeklyWorkoutTarget: toInputValue(goals.weeklyWorkoutTarget),
    dailyStepsTarget: toInputValue(goals.dailyStepsTarget),
    dailyWaterTargetLiters: toInputValue(goals.dailyWaterTargetLiters),
    calorieTarget: toInputValue(goals.calorieTarget),
    proteinTarget: toInputValue(goals.proteinTarget),
    targetDate: goals.targetDate || '',
    notes: goals.notes || '',
  };
}

function mapNutritionToForm(plan) {
  const empty = createEmptyNutritionForm();

  if (!plan) return empty;

  return {
    title: plan.title || '',
    notes: plan.notes || '',
    dailyTargets: {
      calories: toInputValue(plan.dailyTargets?.calories),
      protein: toInputValue(plan.dailyTargets?.protein),
      carbs: toInputValue(plan.dailyTargets?.carbs),
      fat: toInputValue(plan.dailyTargets?.fat),
      waterLiters: toInputValue(plan.dailyTargets?.waterLiters),
    },
    pinnedMenu: normalizePinnedMenu(plan.pinnedMenu),
    meals: Array.isArray(plan.meals)
      ? plan.meals.map(meal => ({
          id: meal.id || makeId('meal'),
          name: meal.name || '',
          time: meal.time || '',
          notes: meal.notes || '',
          items: Array.isArray(meal.items)
            ? meal.items.map(item => ({
                id: item.id || makeId('meal-item'),
                name: item.name || '',
                amount: item.amount || '',
                imageUrl: item.imageUrl || '',
                calories: toInputValue(item.calories),
                protein: toInputValue(item.protein),
                carbs: toInputValue(item.carbs),
                fat: toInputValue(item.fat),
                notes: item.notes || '',
              }))
            : [],
        }))
      : [],
  };
}

function mapWorkoutToForm(plan) {
  const empty = createEmptyWorkoutForm();

  if (!plan) return empty;

  return {
    title: plan.title || '',
    goalFocus: plan.goalFocus || '',
    notes: plan.notes || '',
    weeklyTargets: {
      workouts: toInputValue(plan.weeklyTargets?.workouts),
      cardioMinutes: toInputValue(plan.weeklyTargets?.cardioMinutes),
      steps: toInputValue(plan.weeklyTargets?.steps),
    },
    days: Array.isArray(plan.days)
      ? plan.days.map(day => ({
          id: day.id || makeId('day'),
          name: day.name || '',
          focus: day.focus || '',
          notes: day.notes || '',
          exercises: Array.isArray(day.exercises)
            ? day.exercises.map(exercise => ({
                id: exercise.id || makeId('exercise'),
                name: exercise.name || '',
                externalExerciseId: exercise.externalExerciseId || '',
                mediaUrl: exercise.mediaUrl || '',
                sets: toInputValue(exercise.sets),
                reps: toInputValue(exercise.reps),
                restSeconds: toInputValue(exercise.restSeconds),
                durationSeconds: toInputValue(exercise.durationSeconds),
                notes: exercise.notes || '',
              }))
            : [],
        }))
      : [],
  };
}

function mapHabitAssignmentsToForm(habits) {
  if (!Array.isArray(habits)) return [];

  return habits.map(habit => ({
    id: habit.id || makeId('habit'),
    title: habit.title || '',
    frequency: habit.frequency || 'daily',
    targetCount: toInputValue(habit.targetCount || 1),
    notes: habit.notes || '',
    isActive: habit.isActive !== false,
  }));
}

function mapCheckInTemplateToForm(template) {
  const empty = createEmptyCheckInTemplateForm();

  if (!template) return empty;

  return {
    title: template.title || '',
    intro: template.intro || '',
    questions: Array.isArray(template.questions)
      ? template.questions.map(question => ({
          id: question.id || makeId('check-in-question'),
          label: question.label || '',
          type: question.type || 'shortText',
          placeholder: question.placeholder || '',
          helperText: question.helperText || '',
          required: question.required !== false,
        }))
      : [],
  };
}

function mapQuickMessageTemplatesToForm(templates, { seedDefaults = false } = {}) {
  const normalized = Array.isArray(templates)
    ? templates
        .map((template, index) => ({
          id: template?.id || makeId('quick-message-template'),
          title: template?.title || `תבנית ${index + 1}`,
          text: template?.text || '',
        }))
        .filter(template => template.title.trim() || template.text.trim())
    : [];

  if (normalized.length === 0 && seedDefaults) {
    return createSeedQuickMessageTemplates();
  }

  return normalized;
}

function validateQuickMessageTemplates(templates) {
  if (!Array.isArray(templates)) {
    return 'לא הצלחנו לקרוא את תבניות ההודעות';
  }

  if (templates.length === 0) {
    return 'השאירי לפחות תבנית הודעה מהירה אחת';
  }

  for (let index = 0; index < templates.length; index += 1) {
    const template = templates[index] || {};
    const title = String(template.title || '').trim();
    const text = String(template.text || '').trim();

    if (!title && !text) {
      return `תבנית הודעה מספר ${index + 1} ריקה. אפשר למחוק אותה או למלא תוכן.`;
    }

    if (!text) {
      return `חסר נוסח לתבנית "${title || `תבנית ${index + 1}`}"`;
    }
  }

  return null;
}

function serializeQuickMessageTemplates(templates) {
  return templates
    .map((template, index) => ({
      id: template.id || makeId('quick-message-template'),
      title: template.title.trim() || `תבנית ${index + 1}`,
      text: template.text.trim(),
    }))
    .filter(template => template.text);
}

function applyQuickMessageTemplate(text, client) {
  const fullName = String(client?.name || '').trim();
  const firstName = getClientFirstName(client);

  return String(text || '')
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, fullName || firstName);
}

function serializeGoals(form) {
  return {
    weightGoalKg: form.weightGoalKg,
    weeklyWorkoutTarget: form.weeklyWorkoutTarget,
    dailyStepsTarget: form.dailyStepsTarget,
    dailyWaterTargetLiters: form.dailyWaterTargetLiters,
    calorieTarget: form.calorieTarget,
    proteinTarget: form.proteinTarget,
    targetDate: form.targetDate.trim(),
    notes: form.notes.trim(),
  };
}

function mapClientToAccountForm(client) {
  if (!client) return createEmptyAccountForm();

  return {
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    weight: toInputValue(client.weight),
    height: toInputValue(client.height),
    age: toInputValue(client.age),
    goal: client.goal || '',
    activityLevel: client.activityLevel || '',
    clientType: client.clientType || '',
    notes: client.notes || '',
    coachPrivateNotes: client.coachPrivateNotes || '',
    coachStatus: client.coachStatus || '',
    coachTagsText: Array.isArray(client.coachTags) ? client.coachTags.join(', ') : '',
    newPassword: '',
    confirmNewPassword: '',
    isActive: client.isActive !== false,
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateAccountForm(form) {
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const password = form.newPassword.trim();
  const confirmation = form.confirmNewPassword.trim();

  if (!name) return 'שם הלקוחה הוא שדה חובה';
  if (!email || !isValidEmail(email)) return 'נא להזין אימייל תקין';

  if (password || confirmation) {
    if (password.length < 6) return 'הסיסמה החדשה חייבת להיות לפחות 6 תווים';
    if (!confirmation) return 'נא לאשר את הסיסמה החדשה';
    if (password !== confirmation) return 'אימות הסיסמה אינו תואם';
  }

  if (form.weight && Number.isNaN(Number(form.weight))) return 'המשקל חייב להיות מספר תקין';
  if (form.height && Number.isNaN(Number(form.height))) return 'הגובה חייב להיות מספר תקין';
  if (form.age && Number.isNaN(Number(form.age))) return 'הגיל חייב להיות מספר תקין';

  return null;
}

function serializeAccount(form) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    weight: form.weight,
    height: form.height,
    age: form.age,
    goal: form.goal.trim(),
    activityLevel: form.activityLevel.trim(),
    clientType: normalizeClientTypeLabel(form.clientType),
    notes: form.notes.trim(),
    coachPrivateNotes: (form.coachPrivateNotes || '').trim(),
    coachStatus: form.coachStatus.trim(),
    coachTags: form.coachTagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
    isActive: form.isActive,
  };

  const nextPassword = form.newPassword.trim();
  if (nextPassword) {
    payload.newPassword = nextPassword;
  }

  return payload;
}

function serializeHabits(form) {
  return form.map(habit => ({
    id: habit.id,
    title: habit.title.trim(),
    frequency: habit.frequency,
    targetCount: habit.targetCount,
    notes: habit.notes.trim(),
    isActive: habit.isActive,
  }));
}

function serializeCheckInTemplate(form) {
  return {
    title: form.title.trim(),
    intro: form.intro.trim(),
    questions: form.questions.map(question => ({
      id: question.id,
      label: question.label.trim(),
      type: question.type,
      placeholder: question.placeholder.trim(),
      helperText: question.helperText.trim(),
      required: question.required,
    })),
  };
}

function serializeNutrition(form) {
  return {
    title: form.title.trim(),
    notes: form.notes.trim(),
    dailyTargets: {
      calories: form.dailyTargets.calories,
      protein: form.dailyTargets.protein,
      carbs: form.dailyTargets.carbs,
      fat: form.dailyTargets.fat,
      waterLiters: form.dailyTargets.waterLiters,
    },
    pinnedMenu: serializePinnedMenu(form.pinnedMenu),
    meals: form.meals.map(meal => ({
      id: meal.id,
      name: meal.name.trim(),
      time: meal.time.trim(),
      notes: meal.notes.trim(),
      items: meal.items.map(item => ({
        id: item.id,
        name: item.name.trim(),
        amount: item.amount.trim(),
        imageUrl: item.imageUrl.trim(),
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        notes: item.notes.trim(),
      })),
    })),
  };
}

function serializeWorkout(form) {
  return {
    title: form.title.trim(),
    goalFocus: form.goalFocus.trim(),
    notes: form.notes.trim(),
    weeklyTargets: {
      workouts: form.weeklyTargets.workouts,
      cardioMinutes: form.weeklyTargets.cardioMinutes,
      steps: form.weeklyTargets.steps,
    },
    days: form.days.map(day => ({
      id: day.id,
      name: day.name.trim(),
      focus: day.focus.trim(),
      notes: day.notes.trim(),
      exercises: day.exercises.map((exercise, index) => ({
        id: exercise.id,
        order: index + 1,
        name: exercise.name.trim(),
        externalExerciseId: exercise.externalExerciseId.trim(),
        mediaUrl: exercise.mediaUrl.trim(),
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        durationSeconds: exercise.durationSeconds,
        notes: exercise.notes.trim(),
      })),
    })),
  };
}

function validateNutrition(form) {
  for (let mealIndex = 0; mealIndex < form.meals.length; mealIndex += 1) {
    const meal = form.meals[mealIndex];
    if (!meal.name.trim()) {
      return `חסר שם לארוחה מספר ${mealIndex + 1}`;
    }

    for (let itemIndex = 0; itemIndex < meal.items.length; itemIndex += 1) {
      if (!meal.items[itemIndex].name.trim()) {
        return `חסר שם לפריט מספר ${itemIndex + 1} בארוחה ${meal.name || mealIndex + 1}`;
      }
    }
  }

  return null;
}

function validateWorkout(form) {
  for (let dayIndex = 0; dayIndex < form.days.length; dayIndex += 1) {
    const day = form.days[dayIndex];
    if (!day.name.trim()) {
      return `חסר שם ליום אימון מספר ${dayIndex + 1}`;
    }

    for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex += 1) {
      if (!day.exercises[exerciseIndex].name.trim()) {
        return `חסר שם לתרגיל מספר ${exerciseIndex + 1} ביום ${day.name || dayIndex + 1}`;
      }
    }
  }

  return null;
}

function validateHabits(form) {
  for (let habitIndex = 0; habitIndex < form.length; habitIndex += 1) {
    const habit = form[habitIndex];
    if (!habit.title.trim()) {
      return `חסר שם להרגל מספר ${habitIndex + 1}`;
    }

    if (habit.targetCount && Number.isNaN(Number(habit.targetCount))) {
      return `יעד הכמות של ${habit.title.trim()} חייב להיות מספר`;
    }
  }

  return null;
}

function validateCheckInTemplate(form) {
  for (let questionIndex = 0; questionIndex < form.questions.length; questionIndex += 1) {
    const question = form.questions[questionIndex];
    if (!question.label.trim()) {
      return `חסר טקסט לשאלת צ׳ק-אין מספר ${questionIndex + 1}`;
    }
  }

  return null;
}

function formatCheckInAnswerValue(answer) {
  if (answer?.type === 'yesNo') {
    return answer.value ? 'כן' : 'לא';
  }

  if (answer?.type === 'scale') {
    return `${answer.value}/5`;
  }

  return String(answer?.value ?? '');
}

function sortFoodDiaryEntries(entries) {
  return [...entries].sort((first, second) =>
    String(second?.date || '').localeCompare(String(first?.date || ''))
  );
}

function upsertFoodDiaryEntries(entries, entry) {
  const normalizedEntry = normalizeFoodDiaryEntry(entry, entry?.date || getFoodDiaryDateKey());

  return sortFoodDiaryEntries([
    normalizedEntry,
    ...entries.filter(existing => existing.date !== normalizedEntry.date),
  ]);
}

function SectionCard({ title, subtitle, children, actionLabel, onActionPress, icon }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress} style={styles.sectionAction}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <View style={styles.sectionHeaderText}>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {icon ? <Ionicons name={icon} size={18} color={COLORS.primary} /> : null}
          </View>
        </View>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        textAlign="right"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function SummaryChip({ label, value, color = COLORS.primary }) {
  return (
    <View style={[styles.summaryChip, { borderColor: `${color}55` }]}>
      <Text style={[styles.summaryChipValue, { color }]}>{value}</Text>
      <Text style={styles.summaryChipLabel}>{label}</Text>
    </View>
  );
}

export default function CoachClientPlansModal({ visible, clientId, onClose, onSaved }) {
  const pinnedMenuExportRef = useRef(null);
  const contentScrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPinnedMenu, setExportingPinnedMenu] = useState(false);
  const [sharingPinnedMenu, setSharingPinnedMenu] = useState(false);
  const [foodDiarySaving, setFoodDiarySaving] = useState(false);
  const [sendingAutomationReminder, setSendingAutomationReminder] = useState(false);
  const [quickMessageTemplates, setQuickMessageTemplates] = useState([]);
  const [planTemplateProfiles, setPlanTemplateProfiles] = useState([]);
  const [messageTemplatesSaving, setMessageTemplatesSaving] = useState(false);
  const [planTemplateBusyKey, setPlanTemplateBusyKey] = useState('');
  const [sendingQuickMessageId, setSendingQuickMessageId] = useState(null);
  const [client, setClient] = useState(null);
  const [accountForm, setAccountForm] = useState(createEmptyAccountForm());
  const [goalsForm, setGoalsForm] = useState(createEmptyGoalsForm());
  const [nutritionForm, setNutritionForm] = useState(createEmptyNutritionForm());
  const [workoutForm, setWorkoutForm] = useState(createEmptyWorkoutForm());
  const [habitForm, setHabitForm] = useState([]);
  const [checkInTemplateForm, setCheckInTemplateForm] = useState(createEmptyCheckInTemplateForm());
  const [latestCheckInEntry, setLatestCheckInEntry] = useState(null);
  const [recipeQuery, setRecipeQuery] = useState('');
  const [activeRecipeCategory, setActiveRecipeCategory] = useState(RECIPE_CATEGORY_ALL);

  // מאגר ארוחות של המאמנת
  const [coachMeals, setCoachMeals] = useState([]);
  const [coachMealQuery, setCoachMealQuery] = useState('');
  const [activeCoachMealCategory, setActiveCoachMealCategory] = useState('הכל');
  const [foodDiaryEntries, setFoodDiaryEntries] = useState([]);
  const [foodDiaryEditorVisible, setFoodDiaryEditorVisible] = useState(false);
  const [editingFoodDiaryEntry, setEditingFoodDiaryEntry] = useState(null);

  const resetForms = useCallback(() => {
    setClient(null);
    setAccountForm(createEmptyAccountForm());
    setGoalsForm(createEmptyGoalsForm());
    setNutritionForm(createEmptyNutritionForm());
    setWorkoutForm(createEmptyWorkoutForm());
    setHabitForm([]);
    setCheckInTemplateForm(createEmptyCheckInTemplateForm());
    setLatestCheckInEntry(null);
    setRecipeQuery('');
    setActiveRecipeCategory(RECIPE_CATEGORY_ALL);
    setCoachMeals([]);
    setCoachMealQuery('');
    setActiveCoachMealCategory('הכל');
    setFoodDiaryEntries([]);
    setFoodDiaryEditorVisible(false);
    setEditingFoodDiaryEntry(null);
    setQuickMessageTemplates([]);
    setPlanTemplateProfiles([]);
    setMessageTemplatesSaving(false);
    setPlanTemplateBusyKey('');
    setSendingQuickMessageId(null);
    setSendingAutomationReminder(false);
    setExportingPinnedMenu(false);
    setSharingPinnedMenu(false);
  }, []);

  const queryMatchedRecipes = RECIPE_CATALOG.filter(recipe => {
    const query = recipeQuery.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      recipe.title,
      recipe.category,
      recipe.summary,
      recipe.portion,
      ...recipe.ingredients,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  const filteredRecipes = queryMatchedRecipes.filter(
    recipe =>
      activeRecipeCategory === RECIPE_CATEGORY_ALL || recipe.category === activeRecipeCategory
  );

  const groupedRecipes = RECIPE_CATEGORIES.filter(category => category !== RECIPE_CATEGORY_ALL)
    .map(category => ({
      category,
      recipes: filteredRecipes.filter(recipe => recipe.category === category),
    }))
    .filter(group => group.recipes.length > 0);

  const recipeCategoryCounts = RECIPE_CATEGORIES.reduce((accumulator, category) => {
    accumulator[category] =
      category === RECIPE_CATEGORY_ALL
        ? queryMatchedRecipes.length
        : queryMatchedRecipes.filter(recipe => recipe.category === category).length;
    return accumulator;
  }, {});

  // סינון מאגר של המאמנת
  const coachMealCategories = ['הכל', ...new Set(coachMeals.map(m => m.category))];

  const filteredCoachMeals = coachMeals.filter(meal => {
    const matchesCategory =
      activeCoachMealCategory === 'הכל' || meal.category === activeCoachMealCategory;
    const q = coachMealQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      meal.title.toLowerCase().includes(q) ||
      (meal.description || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const currentClientType = normalizeClientTypeLabel(accountForm.clientType);
  const activePlanTemplateProfile = findPlanTemplateProfile(
    planTemplateProfiles,
    currentClientType
  );
  const pinnedMenuDraft = normalizePinnedMenu(nutritionForm.pinnedMenu);
  const hasPinnedMenuDraft = hasPinnedMenuContent(pinnedMenuDraft);

  const loadClient = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const result = await coachAPI.getClient(clientId);
      setClient(result.client || null);
      setAccountForm(mapClientToAccountForm(result.client));
      setGoalsForm(mapGoalsToForm(result.goals));
      setNutritionForm(mapNutritionToForm(result.nutritionPlan));
      setWorkoutForm(mapWorkoutToForm(result.workoutPlan));
      setHabitForm(mapHabitAssignmentsToForm(result.client?.habitAssignments));
      setCheckInTemplateForm(mapCheckInTemplateToForm(result.client?.checkInTemplate));
      setLatestCheckInEntry(result.latestCheckInEntry || null);
      const recentEntries = Array.isArray(result.foodDiaryEntries)
        ? result.foodDiaryEntries.map(entry => normalizeFoodDiaryEntry(entry, entry?.date))
        : [];
      const todayEntry = result.todayFoodDiary
        ? normalizeFoodDiaryEntry(result.todayFoodDiary, result.todayFoodDiary?.date)
        : null;

      setFoodDiaryEntries(
        todayEntry ? upsertFoodDiaryEntries(recentEntries, todayEntry) : recentEntries
      );

      try {
        const templatesRes = await coachAPI.getMessageTemplates();
        setQuickMessageTemplates(
          mapQuickMessageTemplatesToForm(templatesRes.templates, { seedDefaults: true })
        );
      } catch {
        setQuickMessageTemplates(mapQuickMessageTemplatesToForm([], { seedDefaults: true }));
      }

      try {
        const planTemplatesRes = await coachAPI.getPlanTemplates();
        setPlanTemplateProfiles(
          Array.isArray(planTemplatesRes.profiles) ? planTemplatesRes.profiles : []
        );
      } catch {
        setPlanTemplateProfiles([]);
      }

      try {
        const mealsRes = await coachAPI.getMeals();
        setCoachMeals(mealsRes.meals || []);
      } catch {
        setCoachMeals([]);
      }
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לטעון את פרטי הלקוחה');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [clientId, onClose]);

  useEffect(() => {
    if (visible && clientId) {
      loadClient();
      setActiveTab('goals');
    }

    if (!visible) {
      resetForms();
      setActiveTab('goals');
    }
  }, [visible, clientId, loadClient, resetForms]);

  useEffect(() => {
    if (visible && !loading) {
      contentScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible, loading, clientId]);

  const updateGoalField = (field, value) => {
    setGoalsForm(current => ({ ...current, [field]: value }));
  };

  const updateAccountField = (field, value) => {
    setAccountForm(current => ({ ...current, [field]: value }));
  };

  const updateNutritionField = (field, value) => {
    setNutritionForm(current => ({ ...current, [field]: value }));
  };

  const updateNutritionTarget = (field, value) => {
    setNutritionForm(current => ({
      ...current,
      dailyTargets: { ...current.dailyTargets, [field]: value },
    }));
  };

  const updatePinnedMenuField = (field, value) => {
    setNutritionForm(current => ({
      ...current,
      pinnedMenu: {
        ...normalizePinnedMenu(current.pinnedMenu),
        [field]: value,
      },
    }));
  };

  const handleGeneratePinnedMenuDraft = () => {
    const generatedMenu = buildAutomaticPinnedMenuFromNutrition(nutritionForm, {
      title: pinnedMenuDraft.title || nutritionForm.title,
      periodLabel: pinnedMenuDraft.periodLabel || 'תפריט יומי',
    });

    if (!hasPinnedMenuContent(generatedMenu)) {
      Alert.alert(
        'אין מספיק תוכן ליצירה אוטומטית',
        'כדי ליצור תפריט אוטומטי צריך לפחות ארוחה אחת, יעד יומי או הערות כלליות.'
      );
      return;
    }

    setNutritionForm(current => ({
      ...current,
      pinnedMenu: generatedMenu,
    }));

    Alert.alert(
      'טיוטת תפריט מוכנה',
      'יצרתי טיוטה אוטומטית. אפשר לערוך כאן או לשמור אותה כמו שהיא למתאמנת.'
    );
  };

  const handleSwitchToFreeformPinnedMenu = () => {
    setNutritionForm(current => {
      const currentPinnedMenu = normalizePinnedMenu(current.pinnedMenu);

      return {
        ...current,
        pinnedMenu: {
          ...currentPinnedMenu,
          mode: 'freeform',
          title: currentPinnedMenu.title || current.title || 'תפריט אישי',
        },
      };
    });
  };

  const clearPinnedMenuDraft = () => {
    setNutritionForm(current => ({
      ...current,
      pinnedMenu: createEmptyPinnedMenu(),
    }));
  };

  const capturePinnedMenuPreview = async () => {
    if (!hasPinnedMenuDraft) {
      throw new Error('אין עדיין תפריט מוכן להורדה.');
    }

    const captureHandle = pinnedMenuExportRef.current;

    if (!captureHandle || typeof captureHandle.capture !== 'function') {
      throw new Error('התצוגה המקדימה עדיין נטענת. נסי שוב בעוד רגע.');
    }

    return captureHandle.capture({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  };

  const handleDownloadPinnedMenu = async () => {
    setExportingPinnedMenu(true);

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        throw new Error('כדי להוריד את התפריט צריך לאשר גישה לתמונות במכשיר.');
      }

      const imageUri = await capturePinnedMenuPreview();
      const asset = await MediaLibrary.createAssetAsync(imageUri);

      if (Platform.OS === 'android') {
        const existingAlbum = await MediaLibrary.getAlbumAsync('Shalhevet');

        if (existingAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
        } else {
          await MediaLibrary.createAlbumAsync('Shalhevet', asset, false);
        }
      }

      Alert.alert('נשמר לגלריה', 'התפריט נשמר כתמונה במכשיר עם הטמפלייט המלא.');
    } catch (err) {
      Alert.alert('לא הצלחנו להוריד את התפריט', err.message || 'נסי שוב בעוד רגע.');
    } finally {
      setExportingPinnedMenu(false);
    }
  };

  const handleSharePinnedMenu = async () => {
    setSharingPinnedMenu(true);

    try {
      const shareSupported = await Sharing.isAvailableAsync();

      if (!shareSupported) {
        throw new Error('שיתוף תמונה לא זמין כרגע במכשיר הזה.');
      }

      const imageUri = await capturePinnedMenuPreview();
      await Sharing.shareAsync(imageUri, {
        dialogTitle: 'שיתוף התפריט',
        mimeType: 'image/png',
      });
    } catch (err) {
      Alert.alert('לא הצלחנו לשתף את התפריט', err.message || 'נסי שוב בעוד רגע.');
    } finally {
      setSharingPinnedMenu(false);
    }
  };

  const addMeal = () => {
    setNutritionForm(current => ({
      ...current,
      meals: [...current.meals, createEmptyMeal()],
    }));
  };

  const removeMeal = mealId => {
    setNutritionForm(current => ({
      ...current,
      meals: current.meals.filter(meal => meal.id !== mealId),
    }));
  };

  const updateMealField = (mealId, field, value) => {
    setNutritionForm(current => ({
      ...current,
      meals: current.meals.map(meal => (meal.id === mealId ? { ...meal, [field]: value } : meal)),
    }));
  };

  const addMealItem = mealId => {
    setNutritionForm(current => ({
      ...current,
      meals: current.meals.map(meal =>
        meal.id === mealId ? { ...meal, items: [...meal.items, createEmptyMealItem()] } : meal
      ),
    }));
  };

  const removeMealItem = (mealId, itemId) => {
    setNutritionForm(current => ({
      ...current,
      meals: current.meals.map(meal =>
        meal.id === mealId
          ? { ...meal, items: meal.items.filter(item => item.id !== itemId) }
          : meal
      ),
    }));
  };

  const updateMealItemField = (mealId, itemId, field, value) => {
    setNutritionForm(current => ({
      ...current,
      meals: current.meals.map(meal =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              items: meal.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
              ),
            }
      ),
    }));
  };

  const addRecipeToNutritionPlan = recipe => {
    const meal = createNutritionMealFromRecipe(recipe, makeId);

    setNutritionForm(current => ({
      ...current,
      meals: [...current.meals, meal],
    }));

    Alert.alert('נוסף לתזונה', `${recipe.title} נוסף כמתכון חדש בתוכנית התזונה.`);
  };

  const addCoachMealToNutritionPlan = coachMeal => {
    const mealItems =
      Array.isArray(coachMeal.items) && coachMeal.items.length > 0
        ? coachMeal.items.map(item => ({
            id: makeId('meal-item'),
            name: item.name || coachMeal.title,
            amount: item.amount || coachMeal.portion || '',
            imageUrl: item.imageUrl || '',
            calories: String(item.calories || coachMeal.calories || 0),
            protein: String(item.protein || coachMeal.protein || 0),
            carbs: String(item.carbs || coachMeal.carbs || 0),
            fat: String(item.fat || coachMeal.fat || 0),
            notes: item.notes || '',
          }))
        : [
            {
              id: makeId('meal-item'),
              name: coachMeal.title,
              amount: coachMeal.portion || '',
              imageUrl: coachMeal.imageUrl || '',
              calories: String(coachMeal.calories || 0),
              protein: String(coachMeal.protein || 0),
              carbs: String(coachMeal.carbs || 0),
              fat: String(coachMeal.fat || 0),
              notes: coachMeal.description || '',
            },
          ];

    const ingredientNotes =
      Array.isArray(coachMeal.ingredients) && coachMeal.ingredients.length > 0
        ? '\n\nמצרכים:\n' + coachMeal.ingredients.map(i => `- ${i}`).join('\n')
        : '';

    const instructionNotes =
      Array.isArray(coachMeal.instructions) && coachMeal.instructions.length > 0
        ? '\n\nהכנה:\n' + coachMeal.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : '';

    const meal = {
      id: makeId('meal'),
      name: coachMeal.title,
      time: '',
      notes: (coachMeal.description || '') + ingredientNotes + instructionNotes,
      items: mealItems,
    };

    setNutritionForm(current => ({
      ...current,
      meals: [...current.meals, meal],
    }));

    Alert.alert('נוסף לתזונה', `${coachMeal.title} הוסף מהמאגר שלך לתוכנית הלקוחה.`);
  };

  const showRecipeImagePrompt = recipe => {
    Alert.alert(`פרומפט תמונה: ${recipe.title}`, recipe.imagePrompt);
  };

  const openFoodDiaryEditor = entry => {
    setEditingFoodDiaryEntry(normalizeFoodDiaryEntry(entry, entry?.date || getFoodDiaryDateKey()));
    setFoodDiaryEditorVisible(true);
  };

  const handleSaveFoodDiary = async (date, meals) => {
    if (!clientId || !date) return;

    setFoodDiarySaving(true);
    try {
      const result = await coachAPI.updateClientFoodDiary(clientId, date, { meals });
      const normalizedEntry = normalizeFoodDiaryEntry(result.entry, date);
      const recentEntries = Array.isArray(result.recentEntries)
        ? result.recentEntries.map(entry => normalizeFoodDiaryEntry(entry, entry?.date))
        : [];

      setFoodDiaryEntries(upsertFoodDiaryEntries(recentEntries, normalizedEntry));
      setEditingFoodDiaryEntry(normalizedEntry);
      setFoodDiaryEditorVisible(false);
      Alert.alert('✅ נשמר', 'יומן האכילה עודכן בהצלחה');
      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את יומן האכילה');
    } finally {
      setFoodDiarySaving(false);
    }
  };

  const handleSendAutomationReminder = async () => {
    if (!clientId) return;

    setSendingAutomationReminder(true);
    try {
      const result = await coachAPI.sendAutomationReminder(clientId);
      setClient(current =>
        current
          ? {
              ...current,
              automationStatus: result.automationStatus || current.automationStatus,
            }
          : current
      );
      Alert.alert('✅ נשלח', result.message || 'נשלחה תזכורת אוטומטית ללקוחה');
      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשלוח תזכורת כרגע');
    } finally {
      setSendingAutomationReminder(false);
    }
  };

  const addQuickMessageTemplate = () => {
    setQuickMessageTemplates(current => [...current, createEmptyQuickMessageTemplate()]);
  };

  const removeQuickMessageTemplate = templateId => {
    setQuickMessageTemplates(current => current.filter(template => template.id !== templateId));
  };

  const updateQuickMessageTemplateField = (templateId, field, value) => {
    setQuickMessageTemplates(current =>
      current.map(template =>
        template.id === templateId ? { ...template, [field]: value } : template
      )
    );
  };

  const handleSaveQuickMessageTemplates = async () => {
    const validationMessage = validateQuickMessageTemplates(quickMessageTemplates);
    if (validationMessage) {
      Alert.alert('שגיאה', validationMessage);
      return;
    }

    setMessageTemplatesSaving(true);
    try {
      const result = await coachAPI.updateMessageTemplates(
        serializeQuickMessageTemplates(quickMessageTemplates)
      );
      setQuickMessageTemplates(mapQuickMessageTemplatesToForm(result.templates));
      Alert.alert('✅ נשמר', result.message || 'תבניות ההודעות נשמרו בהצלחה');
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את תבניות ההודעות כרגע');
    } finally {
      setMessageTemplatesSaving(false);
    }
  };

  const handleSendQuickMessageTemplate = async templateId => {
    if (!clientId) return;

    const template = quickMessageTemplates.find(item => item.id === templateId);
    const messageText = applyQuickMessageTemplate(template?.text, client).trim();

    if (!messageText) {
      Alert.alert('שגיאה', 'נא למלא נוסח הודעה לפני השליחה');
      return;
    }

    setSendingQuickMessageId(templateId);
    try {
      const result = await coachAPI.sendMessage(clientId, messageText);
      setClient(current =>
        current
          ? {
              ...current,
              automationStatus: result.automationStatus || current.automationStatus,
            }
          : current
      );
      Alert.alert('✅ נשלח', result.message || 'ההודעה נשלחה ללקוחה');
      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשלוח את ההודעה כרגע');
    } finally {
      setSendingQuickMessageId(null);
    }
  };

  const persistClientTypeIfNeeded = async typeLabel => {
    const normalizedType = normalizeClientTypeLabel(typeLabel);
    const savedType = normalizeClientTypeLabel(client?.clientType);

    if (!clientId || !normalizedType || normalizedType === savedType) {
      return client;
    }

    const result = await coachAPI.updateClient(clientId, { clientType: normalizedType });
    setClient(result.client || null);
    setAccountForm(current => ({
      ...current,
      clientType: result.client?.clientType || normalizedType,
    }));

    return result.client || client;
  };

  const handleSavePlanTemplate = async kind => {
    const typeLabel = normalizeClientTypeLabel(accountForm.clientType);

    if (!typeLabel) {
      Alert.alert('חסר סוג לקוחה', 'כדי לשמור תבנית צריך להגדיר קודם סוג לקוחה בטאב החשבון.');
      return;
    }

    if (kind === 'nutrition') {
      const validationMessage = validateNutrition(nutritionForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }

      if (!hasNutritionTemplateContent(nutritionForm)) {
        Alert.alert('חסר תוכן', 'עדיין אין מספיק תוכן בתוכנית התזונה כדי לשמור אותה כתבנית.');
        return;
      }
    }

    if (kind === 'workout') {
      const validationMessage = validateWorkout(workoutForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }

      if (!hasWorkoutTemplateContent(workoutForm)) {
        Alert.alert('חסר תוכן', 'עדיין אין מספיק תוכן בתוכנית האימון כדי לשמור אותה כתבנית.');
        return;
      }
    }

    setPlanTemplateBusyKey(`${kind}-save`);
    try {
      await persistClientTypeIfNeeded(typeLabel);

      const nextProfiles = upsertPlanTemplateProfile(planTemplateProfiles, typeLabel, {
        nutritionTemplate:
          kind === 'nutrition'
            ? serializeNutrition(nutritionForm)
            : activePlanTemplateProfile?.nutritionTemplate || null,
        workoutTemplate:
          kind === 'workout'
            ? serializeWorkout(workoutForm)
            : activePlanTemplateProfile?.workoutTemplate || null,
        updatedAt: new Date().toISOString(),
      });

      const result = await coachAPI.updatePlanTemplates(nextProfiles);
      setPlanTemplateProfiles(Array.isArray(result.profiles) ? result.profiles : []);
      Alert.alert(
        '✅ נשמר',
        kind === 'nutrition'
          ? `תבנית התזונה נשמרה עבור סוג הלקוחה ${typeLabel}`
          : `תבנית האימון נשמרה עבור סוג הלקוחה ${typeLabel}`
      );
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את התבנית כרגע');
    } finally {
      setPlanTemplateBusyKey('');
    }
  };

  const handleApplyPlanTemplate = async kind => {
    const typeLabel = normalizeClientTypeLabel(accountForm.clientType);
    const template =
      kind === 'nutrition'
        ? activePlanTemplateProfile?.nutritionTemplate
        : activePlanTemplateProfile?.workoutTemplate;

    if (!typeLabel) {
      Alert.alert('חסר סוג לקוחה', 'כדי להחיל תבנית צריך להגדיר קודם סוג לקוחה בטאב החשבון.');
      return;
    }

    if (!template) {
      Alert.alert(
        'אין תבנית שמורה',
        kind === 'nutrition'
          ? `עדיין לא נשמרה תבנית תזונה עבור סוג הלקוחה ${typeLabel}`
          : `עדיין לא נשמרה תבנית אימון עבור סוג הלקוחה ${typeLabel}`
      );
      return;
    }

    setPlanTemplateBusyKey(`${kind}-apply`);
    try {
      await persistClientTypeIfNeeded(typeLabel);

      if (kind === 'nutrition') {
        const result = await coachAPI.updateClientNutritionPlan(clientId, template);
        setNutritionForm(mapNutritionToForm(result.nutritionPlan));
        Alert.alert('✅ הוחל', `תבנית התזונה של ${typeLabel} הוחלה ונשמרה ללקוחה.`);
      }

      if (kind === 'workout') {
        const result = await coachAPI.updateClientWorkoutPlan(clientId, template);
        setWorkoutForm(mapWorkoutToForm(result.workoutPlan));
        Alert.alert('✅ הוחל', `תבנית האימון של ${typeLabel} הוחלה ונשמרה ללקוחה.`);
      }

      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן להחיל את התבנית כרגע');
    } finally {
      setPlanTemplateBusyKey('');
    }
  };

  const updateWorkoutField = (field, value) => {
    setWorkoutForm(current => ({ ...current, [field]: value }));
  };

  const addHabit = () => {
    setHabitForm(current => [...current, createEmptyHabit()]);
  };

  const removeHabit = habitId => {
    setHabitForm(current => current.filter(habit => habit.id !== habitId));
  };

  const updateHabitField = (habitId, field, value) => {
    setHabitForm(current =>
      current.map(habit => (habit.id === habitId ? { ...habit, [field]: value } : habit))
    );
  };

  const updateCheckInTemplateField = (field, value) => {
    setCheckInTemplateForm(current => ({ ...current, [field]: value }));
  };

  const addCheckInQuestion = () => {
    setCheckInTemplateForm(current => ({
      ...current,
      questions: [...current.questions, createEmptyCheckInQuestion()],
    }));
  };

  const removeCheckInQuestion = questionId => {
    setCheckInTemplateForm(current => ({
      ...current,
      questions: current.questions.filter(question => question.id !== questionId),
    }));
  };

  const updateCheckInQuestionField = (questionId, field, value) => {
    setCheckInTemplateForm(current => ({
      ...current,
      questions: current.questions.map(question =>
        question.id === questionId ? { ...question, [field]: value } : question
      ),
    }));
  };

  const updateWorkoutTarget = (field, value) => {
    setWorkoutForm(current => ({
      ...current,
      weeklyTargets: { ...current.weeklyTargets, [field]: value },
    }));
  };

  const addWorkoutDay = () => {
    setWorkoutForm(current => ({
      ...current,
      days: [...current.days, createEmptyWorkoutDay()],
    }));
  };

  const removeWorkoutDay = dayId => {
    setWorkoutForm(current => ({
      ...current,
      days: current.days.filter(day => day.id !== dayId),
    }));
  };

  const updateWorkoutDayField = (dayId, field, value) => {
    setWorkoutForm(current => ({
      ...current,
      days: current.days.map(day => (day.id === dayId ? { ...day, [field]: value } : day)),
    }));
  };

  const addExercise = dayId => {
    setWorkoutForm(current => ({
      ...current,
      days: current.days.map(day =>
        day.id === dayId ? { ...day, exercises: [...day.exercises, createEmptyExercise()] } : day
      ),
    }));
  };

  const removeExercise = (dayId, exerciseId) => {
    setWorkoutForm(current => ({
      ...current,
      days: current.days.map(day =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter(exercise => exercise.id !== exerciseId) }
          : day
      ),
    }));
  };

  const updateExerciseField = (dayId, exerciseId, field, value) => {
    setWorkoutForm(current => ({
      ...current,
      days: current.days.map(day =>
        day.id !== dayId
          ? day
          : {
              ...day,
              exercises: day.exercises.map(exercise =>
                exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
              ),
            }
      ),
    }));
  };

  const handleSave = async () => {
    if (!clientId) return;

    if (activeTab === 'account') {
      const validationMessage = validateAccountForm(accountForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }
    }

    if (activeTab === 'nutrition') {
      const validationMessage = validateNutrition(nutritionForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }
    }

    if (activeTab === 'workout') {
      const validationMessage = validateWorkout(workoutForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }
    }

    if (activeTab === 'habits') {
      const validationMessage = validateHabits(habitForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }
    }

    if (activeTab === 'checkin') {
      const validationMessage = validateCheckInTemplate(checkInTemplateForm);
      if (validationMessage) {
        Alert.alert('שגיאה', validationMessage);
        return;
      }
    }

    setSaving(true);
    try {
      if (activeTab === 'account') {
        const previousEmail = String(client?.email || '')
          .trim()
          .toLowerCase();
        const nextEmail = accountForm.email.trim().toLowerCase();
        const emailChanged = Boolean(nextEmail) && nextEmail !== previousEmail;
        const result = await coachAPI.updateClient(clientId, serializeAccount(accountForm));
        setClient(result.client || null);
        setAccountForm(mapClientToAccountForm(result.client));
        Alert.alert(
          '✅ נשמר',
          emailChanged
            ? `פרטי החשבון עודכנו בהצלחה.\nמההתחברות הבאה הלקוחה צריכה להתחבר עם האימייל החדש: ${result.client?.email || nextEmail}`
            : 'פרטי החשבון עודכנו בהצלחה'
        );
      }

      if (activeTab === 'goals') {
        const result = await coachAPI.updateClientGoals(clientId, serializeGoals(goalsForm));
        setGoalsForm(mapGoalsToForm(result.goals));
        Alert.alert('✅ נשמר', 'היעדים עודכנו בהצלחה');
      }

      if (activeTab === 'nutrition') {
        const result = await coachAPI.updateClientNutritionPlan(
          clientId,
          serializeNutrition(nutritionForm)
        );
        setNutritionForm(mapNutritionToForm(result.nutritionPlan));
        Alert.alert(
          '✅ נשמר',
          hasPinnedMenuContent(result.nutritionPlan?.pinnedMenu)
            ? 'תוכנית התזונה והתפריט הנעוץ עודכנו בהצלחה.'
            : 'תוכנית התזונה עודכנה בהצלחה'
        );
      }

      if (activeTab === 'workout') {
        const result = await coachAPI.updateClientWorkoutPlan(
          clientId,
          serializeWorkout(workoutForm)
        );
        setWorkoutForm(mapWorkoutToForm(result.workoutPlan));
        Alert.alert('✅ נשמר', 'תוכנית האימון עודכנה בהצלחה');
      }

      if (activeTab === 'habits') {
        const result = await coachAPI.updateClient(clientId, {
          habitAssignments: serializeHabits(habitForm),
        });
        setClient(result.client || null);
        setHabitForm(mapHabitAssignmentsToForm(result.client?.habitAssignments));
        Alert.alert('✅ נשמר', 'ההרגלים והמשימות עודכנו בהצלחה');
      }

      if (activeTab === 'checkin') {
        const result = await coachAPI.updateClient(clientId, {
          checkInTemplate: serializeCheckInTemplate(checkInTemplateForm),
        });
        setClient(result.client || null);
        setCheckInTemplateForm(mapCheckInTemplateToForm(result.client?.checkInTemplate));
        Alert.alert('✅ נשמר', 'טופס הצ׳ק-אין עודכן בהצלחה');
      }

      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את השינויים');
    } finally {
      setSaving(false);
    }
  };

  const renderPlanTemplateSection = kind => {
    const isNutrition = kind === 'nutrition';
    const template = isNutrition
      ? activePlanTemplateProfile?.nutritionTemplate
      : activePlanTemplateProfile?.workoutTemplate;
    const hasTemplate = Boolean(template);
    const busySave = planTemplateBusyKey === `${kind}-save`;
    const busyApply = planTemplateBusyKey === `${kind}-apply`;
    const savedClientType = normalizeClientTypeLabel(client?.clientType);

    return (
      <SectionCard
        title={isNutrition ? 'תבנית תזונה לפי סוג לקוחה' : 'תבנית אימון לפי סוג לקוחה'}
        subtitle="שמרי פעם אחת סוג לקוחה והחילי אותו בלחיצה על לקוחות דומות"
        icon="layers-outline"
      >
        <View style={styles.summaryChipsRow}>
          <SummaryChip
            label="סוג לקוחה"
            value={currentClientType || 'לא הוגדר'}
            color={COLORS.primary}
          />
          <SummaryChip
            label={isNutrition ? 'תבנית תזונה' : 'תבנית אימון'}
            value={hasTemplate ? 'שמורה' : 'חסרה'}
            color={hasTemplate ? COLORS.success : COLORS.warning}
          />
          <SummaryChip
            label="עודכן"
            value={hasTemplate ? formatPlanTemplateDate(activePlanTemplateProfile?.updatedAt) : '—'}
            color={COLORS.info}
          />
        </View>

        {!currentClientType ? (
          <Text style={styles.emptyStateText}>
            כדי לעבוד עם תבניות לפי סוג לקוחה, עברי קודם לטאב החשבון והגדירי סוג לקוחה.
          </Text>
        ) : (
          <>
            <View style={styles.templateSummaryBox}>
              <Text style={styles.templateSummaryLabel}>
                {hasTemplate ? 'מה שמור כרגע לסוג הזה' : 'עדיין אין תבנית שמורה לסוג הזה'}
              </Text>
              <Text
                style={[
                  styles.templateSummaryText,
                  !hasTemplate && styles.templateSummaryTextMuted,
                ]}
              >
                {isNutrition
                  ? getNutritionTemplateSummary(template)
                  : getWorkoutTemplateSummary(template)}
              </Text>
              {activePlanTemplateProfile ? (
                <Text style={styles.templateSummaryMeta}>
                  לסוג הזה {activePlanTemplateProfile.nutritionTemplate ? 'יש' : 'אין'} גם תבנית
                  תזונה ו-{activePlanTemplateProfile.workoutTemplate ? 'יש' : 'אין'} גם תבנית אימון.
                </Text>
              ) : null}
            </View>

            {savedClientType !== currentClientType ? (
              <Text style={styles.helperText}>
                הסוג החדש יישמר ללקוחה אוטומטית בפעולת שמירה או החלה של תבנית.
              </Text>
            ) : null}

            <View style={styles.templateActionRow}>
              <TouchableOpacity
                style={[
                  styles.templateActionBtn,
                  styles.templateActionPrimaryBtn,
                  (!hasTemplate || busySave || busyApply) && styles.templateActionBtnDisabled,
                ]}
                onPress={() => handleApplyPlanTemplate(kind)}
                disabled={!hasTemplate || busySave || busyApply}
              >
                {busyApply ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={16} color={COLORS.white} />
                    <Text
                      style={[styles.templateActionBtnText, styles.templateActionPrimaryBtnText]}
                    >
                      החילי על הלקוחה
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.templateActionBtn,
                  styles.templateActionSecondaryBtn,
                  (busySave || busyApply) && styles.templateActionBtnDisabled,
                ]}
                onPress={() => handleSavePlanTemplate(kind)}
                disabled={busySave || busyApply}
              >
                {busySave ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color={COLORS.primary} />
                    <Text
                      style={[styles.templateActionBtnText, styles.templateActionSecondaryBtnText]}
                    >
                      {isNutrition ? 'שמרי כתבנית תזונה' : 'שמרי כתבנית אימון'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </SectionCard>
    );
  };

  const renderGoalsTab = () => (
    <>
      <SectionCard
        title="יעדים אישיים"
        subtitle="כאן המאמנת מגדירה יעד ברור ומספרים למדידה"
        icon="flag-outline"
      >
        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="יעד משקל"
              value={goalsForm.weightGoalKg}
              onChangeText={value => updateGoalField('weightGoalKg', value)}
              placeholder="לדוגמה: 60"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="אימונים בשבוע"
              value={goalsForm.weeklyWorkoutTarget}
              onChangeText={value => updateGoalField('weeklyWorkoutTarget', value)}
              placeholder="לדוגמה: 4"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="יעד צעדים יומי"
              value={goalsForm.dailyStepsTarget}
              onChangeText={value => updateGoalField('dailyStepsTarget', value)}
              placeholder="10000"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="יעד מים יומי"
              value={goalsForm.dailyWaterTargetLiters}
              onChangeText={value => updateGoalField('dailyWaterTargetLiters', value)}
              placeholder="2.5"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="יעד קלוריות"
              value={goalsForm.calorieTarget}
              onChangeText={value => updateGoalField('calorieTarget', value)}
              placeholder="1700"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="יעד חלבון"
              value={goalsForm.proteinTarget}
              onChangeText={value => updateGoalField('proteinTarget', value)}
              placeholder="120"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Field
          label="תאריך יעד"
          value={goalsForm.targetDate}
          onChangeText={value => updateGoalField('targetDate', value)}
          placeholder="2026-06-01"
        />
        <Field
          label="הערות למאמנת"
          value={goalsForm.notes}
          onChangeText={value => updateGoalField('notes', value)}
          placeholder="דגשים לליווי, הערות, יעד ביניים..."
          multiline
        />
      </SectionCard>
    </>
  );

  const renderAccountTab = () => (
    <>
      <SectionCard
        title="חשבון והתחברות"
        subtitle="עדכון פרטי כניסה, קשר ונתוני בסיס של הלקוחה"
        icon="key-outline"
      >
        <Field
          label="שם מלא"
          value={accountForm.name}
          onChangeText={value => updateAccountField('name', value)}
          placeholder="שם פרטי ומשפחה"
        />
        <Field
          label="אימייל התחברות"
          value={accountForm.email}
          onChangeText={value => updateAccountField('email', value)}
          placeholder="client@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="טלפון"
          value={accountForm.phone}
          onChangeText={value => updateAccountField('phone', value)}
          placeholder="050-0000000"
          keyboardType="phone-pad"
        />

        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="משקל נוכחי"
              value={accountForm.weight}
              onChangeText={value => updateAccountField('weight', value)}
              placeholder="65"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="גובה"
              value={accountForm.height}
              onChangeText={value => updateAccountField('height', value)}
              placeholder="165"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="גיל"
              value={accountForm.age}
              onChangeText={value => updateAccountField('age', value)}
              placeholder="28"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="מטרה כללית"
              value={accountForm.goal}
              onChangeText={value => updateAccountField('goal', value)}
              placeholder="חיטוב"
            />
          </View>
        </View>

        <Field
          label="רמת פעילות"
          value={accountForm.activityLevel}
          onChangeText={value => updateAccountField('activityLevel', value)}
          placeholder="מתונה"
        />

        <Field
          label="סוג לקוחה לתבניות"
          value={accountForm.clientType}
          onChangeText={value => updateAccountField('clientType', value)}
          placeholder="למשל: חיטוב התחלתי / חזרה לשגרה / מסה נקייה"
        />

        <Text style={styles.helperText}>
          זה הסיווג שלפיו אפשר לשמור ולהחיל תבניות תזונה ואימון על לקוחות דומות.
        </Text>

        <Field
          label="הערות פרופיל"
          value={accountForm.notes}
          onChangeText={value => updateAccountField('notes', value)}
          placeholder="רגישויות, מגבלות או דגשים לליווי"
          multiline
        />

        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="lock-closed" size={14} color={COLORS.primary} />
            <Text style={[styles.fieldLabel, { color: COLORS.primary, marginBottom: 0 }]}>
              הערות פרטיות שלך (הלקוחה לא רואה)
            </Text>
          </View>
          <Field
            value={accountForm.coachPrivateNotes}
            onChangeText={value => updateAccountField('coachPrivateNotes', value)}
            placeholder="הקשר, רגישויות, היסטוריה — מה שאת לא רוצה שהלקוחה תראה"
            multiline
            accessibilityLabel="שדה הערות פרטיות, הלקוחה לא רואה את התוכן"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>סטטוס חשבון</Text>
          <View style={styles.accountStatusRow}>
            <TouchableOpacity
              style={[
                styles.accountStatusBtn,
                accountForm.isActive && styles.accountStatusBtnActive,
              ]}
              onPress={() => updateAccountField('isActive', true)}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={accountForm.isActive ? COLORS.success : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.accountStatusBtnText,
                  accountForm.isActive && styles.accountStatusBtnTextActive,
                ]}
              >
                פעילה
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.accountStatusBtn,
                !accountForm.isActive && styles.accountStatusBtnInactive,
              ]}
              onPress={() => updateAccountField('isActive', false)}
            >
              <Ionicons
                name="pause-circle-outline"
                size={18}
                color={!accountForm.isActive ? COLORS.warning : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.accountStatusBtnText,
                  !accountForm.isActive && styles.accountStatusBtnTextInactive,
                ]}
              >
                לא פעילה
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.accountInfoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
          <Text style={styles.accountInfoText}>
            כל שינוי שנשמר כאן מתעדכן בפרופיל של הלקוחה. אם תשני את האימייל, הכניסה הבאה שלה תהיה עם
            האימייל החדש.
          </Text>
        </View>
      </SectionCard>

      <SectionCard
        title="מעקב אוטומטי"
        subtitle="התראות על לקוחה שלא מגיבה והצעת תזכורת מהירה מתוך האפליקציה"
        icon="flash-outline"
      >
        {(() => {
          const automationStatus = client?.automationStatus || {};
          const automationMeta = getAutomationMeta(automationStatus.level);
          const reminderLocked =
            !automationStatus.reminder?.shouldSendNow && automationStatus.reminder?.lastSentAt;

          return (
            <>
              <View style={styles.summaryChipsRow}>
                <SummaryChip
                  label="סטטוס"
                  value={automationStatus.statusLabel || automationMeta.label}
                  color={automationMeta.color}
                />
                <SummaryChip
                  label="פעילות אחרונה"
                  value={formatAutomationDaysAgo(automationStatus.daysSinceClientActivity)}
                  color={automationMeta.color}
                />
                <SummaryChip
                  label="תזכורת אחרונה"
                  value={formatAutomationDate(automationStatus.reminder?.lastSentAt)}
                  color={COLORS.info}
                />
              </View>

              <View
                style={[
                  styles.automationBanner,
                  {
                    backgroundColor: automationMeta.backgroundColor,
                    borderColor: automationMeta.borderColor,
                  },
                ]}
              >
                <Ionicons name={automationMeta.icon} size={18} color={automationMeta.color} />
                <View style={styles.automationBannerContent}>
                  <Text style={[styles.automationBannerTitle, { color: automationMeta.color }]}>
                    {automationStatus.statusLabel || automationMeta.label}
                  </Text>
                  <Text style={styles.automationBannerText}>
                    {automationStatus.summaryText || 'אין כרגע התראות אוטומטיות על הלקוחה הזו.'}
                  </Text>
                </View>
              </View>

              {Array.isArray(automationStatus.reasons) && automationStatus.reasons.length > 0 ? (
                <View style={styles.automationReasonsList}>
                  {automationStatus.reasons.map(reason => (
                    <View key={reason.id} style={styles.automationReasonRow}>
                      <Ionicons
                        name={reason.severity === 'high' ? 'alert-circle' : 'ellipse'}
                        size={12}
                        color={reason.severity === 'high' ? COLORS.danger : COLORS.warning}
                      />
                      <Text style={styles.automationReasonText}>{reason.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.helperText}>
                  אין כרגע סימנים ללקוחה שלא מגיבה. אם זה ישתנה, תופיע כאן תזכורת מוכנה.
                </Text>
              )}

              <View style={styles.summaryChipsRow}>
                <SummaryChip
                  label="צ׳ק-אין"
                  value={formatAutomationDate(automationStatus.activities?.lastCheckInAt)}
                  color={COLORS.info}
                />
                <SummaryChip
                  label="הרגלים"
                  value={formatAutomationDate(automationStatus.activities?.lastHabitLogAt)}
                  color={COLORS.accent}
                />
                <SummaryChip
                  label="שקילה"
                  value={formatAutomationDate(automationStatus.activities?.lastWeightEntryAt)}
                  color={COLORS.primary}
                />
              </View>

              {automationStatus.reminder?.suggestedText ? (
                <View style={styles.automationReminderPreview}>
                  <Text style={styles.automationReminderPreviewLabel}>נוסח התזכורת</Text>
                  <Text style={styles.automationReminderPreviewText}>
                    {automationStatus.reminder.suggestedText}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.automationReminderBtn,
                  (!automationStatus.reminder?.shouldSendNow || sendingAutomationReminder) &&
                    styles.automationReminderBtnDisabled,
                ]}
                onPress={handleSendAutomationReminder}
                disabled={!automationStatus.reminder?.shouldSendNow || sendingAutomationReminder}
              >
                {sendingAutomationReminder ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color={COLORS.white} />
                    <Text style={styles.automationReminderBtnText}>
                      {automationStatus.reminder?.shouldSendNow
                        ? 'שלחי תזכורת אוטומטית'
                        : 'אין צורך בתזכורת כרגע'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {reminderLocked ? (
                <Text style={styles.helperText}>
                  כבר נשלחה תזכורת אוטומטית לאחרונה. אפשר לנסות שוב בעוד{' '}
                  {automationStatus.reminder?.cooldownHoursRemaining || 0} שעות.
                </Text>
              ) : null}
            </>
          );
        })()}
      </SectionCard>

      <SectionCard
        title="הודעות מהירות"
        subtitle="תבניות אישיות שאפשר לשמור פעם אחת ולשלוח ללקוחה בלחיצה"
        icon="chatbubble-ellipses-outline"
        actionLabel="הוסיפי תבנית"
        onActionPress={addQuickMessageTemplate}
      >
        <Text style={styles.helperText}>
          אפשר להשתמש ב-{'{{firstName}}'} או ב-{'{{name}}'} כדי לשלב את שם הלקוחה אוטומטית בנוסח.
        </Text>

        <View style={styles.summaryChipsRow}>
          <SummaryChip label="תבניות" value={quickMessageTemplates.length} color={COLORS.primary} />
          <SummaryChip label="שליחה ל" value={getClientFirstName(client)} color={COLORS.info} />
        </View>

        {quickMessageTemplates.length === 0 ? (
          <Text style={styles.emptyStateText}>
            עדיין אין תבניות שמורות. לחצי על הוסיפי תבנית כדי להכין נוסחים קבועים לליווי.
          </Text>
        ) : (
          quickMessageTemplates.map((template, index) => {
            const previewText = applyQuickMessageTemplate(template.text, client).trim();

            return (
              <View key={template.id} style={styles.nestedCard}>
                <View style={styles.nestedCardHeader}>
                  <TouchableOpacity
                    onPress={() => removeQuickMessageTemplate(template.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.removeBtnText}>מחיקה</Text>
                  </TouchableOpacity>
                  <Text style={styles.nestedCardTitle}>
                    {template.title.trim() || `תבנית ${index + 1}`}
                  </Text>
                </View>

                <Field
                  label="שם פנימי"
                  value={template.title}
                  onChangeText={value =>
                    updateQuickMessageTemplateField(template.id, 'title', value)
                  }
                  placeholder="למשל: בדיקת דופק / חיזוק / צ׳ק-אין"
                />

                <Field
                  label="נוסח ההודעה"
                  value={template.text}
                  onChangeText={value =>
                    updateQuickMessageTemplateField(template.id, 'text', value)
                  }
                  placeholder="היי {{firstName}}, ..."
                  multiline
                />

                <View style={styles.quickMessagePreview}>
                  <Text style={styles.quickMessagePreviewLabel}>תצוגה לפני שליחה</Text>
                  <Text
                    style={[
                      styles.quickMessagePreviewText,
                      !previewText && styles.quickMessagePreviewTextPlaceholder,
                    ]}
                  >
                    {previewText || 'כתבי נוסח כדי לראות כאן בדיוק מה הלקוחה תקבל.'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.quickMessageSendBtn,
                    (!template.text.trim() || sendingQuickMessageId === template.id) &&
                      styles.quickMessageSendBtnDisabled,
                  ]}
                  onPress={() => handleSendQuickMessageTemplate(template.id)}
                  disabled={!template.text.trim() || sendingQuickMessageId === template.id}
                >
                  {sendingQuickMessageId === template.id ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={16} color={COLORS.white} />
                      <Text style={styles.quickMessageSendBtnText}>שלחי ללקוחה</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={[
            styles.quickMessageSaveBtn,
            messageTemplatesSaving && styles.quickMessageSaveBtnDisabled,
          ]}
          onPress={handleSaveQuickMessageTemplates}
          disabled={messageTemplatesSaving}
        >
          {messageTemplatesSaving ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color={COLORS.primary} />
              <Text style={styles.quickMessageSaveBtnText}>שמרי את התבניות לשימוש חוזר</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.quickMessageFooterText}>
          השמירה חלה על כל הלקוחות. השליחה מכאן מתבצעת רק ללקוחה שפתוחה כרגע.
        </Text>
      </SectionCard>

      <SectionCard
        title="ניהול ליווי"
        subtitle="סטטוס פנימי ותגיות שיעזרו לך לסנן ולנהל את הלקוחה בלוח הבקרה"
        icon="pricetags-outline"
      >
        <Field
          label="סטטוס ליווי"
          value={accountForm.coachStatus}
          onChangeText={value => updateAccountField('coachStatus', value)}
          placeholder="למשל: צריכה חיזוק / במסלול / רדומה"
        />
        <Field
          label="תגיות"
          value={accountForm.coachTagsText}
          onChangeText={value => updateAccountField('coachTagsText', value)}
          placeholder="למשל: חיטוב, חדשה, VIP"
        />
        <Text style={styles.helperText}>הפרידי תגיות בפסיקים. דוגמה: חיטוב, שיקום, חדשה</Text>
      </SectionCard>

      <SectionCard
        title="איפוס סיסמה"
        subtitle="השאירי ריק אם אין צורך לשנות את הסיסמה הנוכחית"
        icon="lock-closed-outline"
      >
        <Field
          label="סיסמה חדשה"
          value={accountForm.newPassword}
          onChangeText={value => updateAccountField('newPassword', value)}
          placeholder="לפחות 6 תווים"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="אימות סיסמה חדשה"
          value={accountForm.confirmNewPassword}
          onChangeText={value => updateAccountField('confirmNewPassword', value)}
          placeholder="הקלידי שוב את הסיסמה החדשה"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </SectionCard>
    </>
  );

  const renderNutritionTab = () => (
    <>
      <SectionCard
        title="יומן אכילה בפועל"
        subtitle="מה שהלקוחה סימנה באפליקציה. זה אותו מידע שמשפיע על הקלוריות שנותרו אצלה."
        icon="journal-outline"
        actionLabel="ערכי את היום"
        onActionPress={() =>
          openFoodDiaryEditor(
            foodDiaryEntries.find(entry => entry.date === getFoodDiaryDateKey()) || {
              date: getFoodDiaryDateKey(),
            }
          )
        }
      >
        {foodDiaryEntries.length === 0 ? (
          <Text style={styles.emptyStateText}>הלקוחה עדיין לא רשמה ארוחות ביומן האכילה.</Text>
        ) : (
          <>
            <View style={styles.summaryChipsRow}>
              <SummaryChip
                label="יום אחרון"
                value={foodDiaryEntries[0].date || '—'}
                color={COLORS.primary}
              />
              <SummaryChip
                label="קלוריות"
                value={Math.round(foodDiaryEntries[0].totals.calories)}
                color={COLORS.accent}
              />
              <SummaryChip
                label="פריטים"
                value={FOOD_DIARY_MEAL_TYPES.reduce(
                  (sum, mealType) => sum + foodDiaryEntries[0].meals[mealType].length,
                  0
                )}
                color={COLORS.info}
              />
            </View>

            {foodDiaryEntries.map(entry => {
              const totals = entry.totals;
              const mealSummary = FOOD_DIARY_MEAL_TYPES.filter(
                mealType => entry.meals[mealType].length > 0
              )
                .map(
                  mealType => `${getFoodDiaryMealLabel(mealType)}: ${entry.meals[mealType].length}`
                )
                .join(' | ');

              return (
                <View key={entry.id || entry.date} style={styles.foodDiaryDayCard}>
                  <View style={styles.foodDiaryDayHeader}>
                    <Text style={styles.foodDiaryDayCalories}>
                      {Math.round(totals.calories)} קל׳
                    </Text>
                    <Text style={styles.foodDiaryDayDate}>{entry.date}</Text>
                  </View>
                  <View style={styles.foodDiaryDayMeta}>
                    <Text style={styles.foodDiaryDayMetaText}>
                      ח׳ {totals.protein.toFixed(0)}ג׳
                    </Text>
                    <Text style={styles.foodDiaryDayMetaText}>פ׳ {totals.carbs.toFixed(0)}ג׳</Text>
                    <Text style={styles.foodDiaryDayMetaText}>ש׳ {totals.fat.toFixed(0)}ג׳</Text>
                  </View>
                  <Text style={styles.foodDiaryDayMeals}>
                    {mealSummary || 'באותו יום עדיין לא נרשמו ארוחות.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.foodDiaryEditBtn}
                    onPress={() => openFoodDiaryEditor(entry)}
                  >
                    <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.foodDiaryEditBtnText}>ערכי יום זה</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>

      {renderPlanTemplateSection('nutrition')}

      <View style={styles.accountInfoBox}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
        <Text style={styles.accountInfoText}>
          כדי לעדכן תזונה ללקוחה: הוסיפי ארוחות מהמאגר שלך או מספריית המתכונים, ערכי לפי הצורך, צרי
          גם תפריט נעוץ אם צריך, ואז לחצי על שמרי תזונה. אחרי השמירה התוכנית והתפריט מתעדכנים מייד
          בדף הבית ובמסך התזונה של הלקוחה.
        </Text>
      </View>

      <SectionCard
        title="תפריט נעוץ למתאמנת"
        subtitle="יופיע בראש מסך התזונה על גבי הטמפלט שהעלית"
        icon="pin-outline"
      >
        <View style={styles.summaryChipsRow}>
          <SummaryChip
            label="סטטוס"
            value={hasPinnedMenuDraft ? 'מוכן להצגה' : 'עדיין ריק'}
            color={hasPinnedMenuDraft ? COLORS.success : COLORS.warning}
          />
          <SummaryChip
            label="דרך יצירה"
            value={pinnedMenuDraft.mode === 'auto' ? 'אוטומטי' : 'חופשי'}
            color={pinnedMenuDraft.mode === 'auto' ? COLORS.primary : COLORS.info}
          />
          <SummaryChip
            label="כותרת"
            value={pinnedMenuDraft.title || 'תפריט אישי'}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.pinnedMenuModeRow}>
          <TouchableOpacity
            style={[
              styles.pinnedMenuModeCard,
              pinnedMenuDraft.mode === 'auto' && styles.pinnedMenuModeCardActive,
            ]}
            onPress={handleGeneratePinnedMenuDraft}
          >
            <View style={[styles.pinnedMenuModeIcon, styles.pinnedMenuModeIconAuto]}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
            </View>
            <Text
              style={[
                styles.pinnedMenuModeTitle,
                pinnedMenuDraft.mode === 'auto' && styles.pinnedMenuModeTitleActive,
              ]}
            >
              יצירה אוטומטית
            </Text>
            <Text style={styles.pinnedMenuModeText}>
              לוחצים פעם אחת ונבנית טיוטה מתוך היעדים, ההערות והארוחות שכבר הוגדרו.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pinnedMenuModeCard,
              pinnedMenuDraft.mode === 'freeform' && styles.pinnedMenuModeCardActive,
            ]}
            onPress={handleSwitchToFreeformPinnedMenu}
          >
            <View style={[styles.pinnedMenuModeIcon, styles.pinnedMenuModeIconFreeform]}>
              <Ionicons name="create-outline" size={18} color={COLORS.info} />
            </View>
            <Text
              style={[
                styles.pinnedMenuModeTitle,
                pinnedMenuDraft.mode === 'freeform' && styles.pinnedMenuModeTitleActive,
              ]}
            >
              כתיבה חופשית
            </Text>
            <Text style={styles.pinnedMenuModeText}>
              כתבי בדיוק כמו בדוגמה שלך, עם לוז יומי, חודשי, החלפות או כל ניסוח חופשי.
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          לחצי שוב על &quot;יצירה אוטומטית&quot; כדי לרענן את הטיוטה מהתוכנית הנוכחית. אחרי זה אפשר
          לערוך או פשוט לשמור כמו שזה.
        </Text>

        <Field
          label="כותרת התפריט"
          value={pinnedMenuDraft.title}
          onChangeText={value => updatePinnedMenuField('title', value)}
          placeholder="תפריט אישי"
        />
        <Field
          label="סוג התפריט / תקופה"
          value={pinnedMenuDraft.periodLabel}
          onChangeText={value => updatePinnedMenuField('periodLabel', value)}
          placeholder="תפריט יומי / חודשי / לו״ז שבועי"
        />
        <Field
          label="תוכן התפריט"
          value={pinnedMenuDraft.bodyText}
          onChangeText={value => updatePinnedMenuField('bodyText', value)}
          placeholder="כתבי כאן את כל הלוז או התפריט בפורמט חופשי. ירידות שורה יישמרו כמו שהן."
          multiline
        />

        <View style={styles.pinnedMenuActionRow}>
          <TouchableOpacity
            style={styles.pinnedMenuSecondaryBtn}
            onPress={handleDownloadPinnedMenu}
            disabled={!hasPinnedMenuDraft || exportingPinnedMenu}
          >
            <Ionicons
              name={exportingPinnedMenu ? 'hourglass-outline' : 'download-outline'}
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.pinnedMenuSecondaryBtnText}>
              {exportingPinnedMenu ? 'שומרת לגלריה...' : 'הורידי לגלריה'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pinnedMenuSecondaryBtn}
            onPress={handleSharePinnedMenu}
            disabled={!hasPinnedMenuDraft || sharingPinnedMenu}
          >
            <Ionicons
              name={sharingPinnedMenu ? 'hourglass-outline' : 'share-social-outline'}
              size={16}
              color={COLORS.info}
            />
            <Text style={[styles.pinnedMenuSecondaryBtnText, styles.pinnedMenuShareBtnText]}>
              {sharingPinnedMenu ? 'פותחת שיתוף...' : 'שתפי כתמונה'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pinnedMenuSecondaryBtn, styles.pinnedMenuClearBtn]}
            onPress={clearPinnedMenuDraft}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={styles.pinnedMenuClearBtnText}>הסירי את התפריט מהנעוץ</Text>
          </TouchableOpacity>
        </View>

        {hasPinnedMenuDraft ? (
          <View style={styles.pinnedMenuPreviewWrap}>
            <Text style={styles.fieldLabel}>כך זה ייראה למתאמנת</Text>
            <View style={styles.pinnedMenuCaptureSurface}>
              <PinnedMenuCard
                menu={pinnedMenuDraft}
                caption="תפריט אישי"
                compact
                displayHeight={PINNED_MENU_MODAL_PREVIEW_HEIGHT}
              />
            </View>
            <Text style={styles.helperText}>
              אפשר לשמור את התפריט כתמונה עם הטמפלייט המלא או לשתף אותו ישירות.
            </Text>
            <View pointerEvents="none" style={styles.hiddenPinnedMenuExportWrap}>
              <ViewShot ref={pinnedMenuExportRef} style={styles.hiddenPinnedMenuExportSurface}>
                <View collapsable={false} style={styles.hiddenPinnedMenuExportCard}>
                  <PinnedMenuCard menu={pinnedMenuDraft} caption="תפריט אישי" />
                </View>
              </ViewShot>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyStateText}>
            עדיין אין תפריט נעוץ. אפשר ליצור אותו אוטומטית או לכתוב אותו ידנית.
          </Text>
        )}
      </SectionCard>

      <SectionCard
        title="פרטי תוכנית תזונה"
        subtitle="שם לתוכנית, הערות ודגשים יומיים"
        icon="restaurant-outline"
      >
        <Field
          label="שם התוכנית"
          value={nutritionForm.title}
          onChangeText={value => updateNutritionField('title', value)}
          placeholder="תוכנית תזונה אישית"
        />
        <Field
          label="הערות כלליות"
          value={nutritionForm.notes}
          onChangeText={value => updateNutritionField('notes', value)}
          placeholder="הנחיות כלליות, דגשים, החלפות..."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="יעדים תזונתיים יומיים"
        subtitle="הגדרות מאקרו ונוזלים"
        icon="nutrition-outline"
      >
        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="קלוריות"
              value={nutritionForm.dailyTargets.calories}
              onChangeText={value => updateNutritionTarget('calories', value)}
              placeholder="1700"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="חלבון"
              value={nutritionForm.dailyTargets.protein}
              onChangeText={value => updateNutritionTarget('protein', value)}
              placeholder="120"
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="פחמימות"
              value={nutritionForm.dailyTargets.carbs}
              onChangeText={value => updateNutritionTarget('carbs', value)}
              placeholder="150"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="שומן"
              value={nutritionForm.dailyTargets.fat}
              onChangeText={value => updateNutritionTarget('fat', value)}
              placeholder="55"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Field
          label="מים בליטרים"
          value={nutritionForm.dailyTargets.waterLiters}
          onChangeText={value => updateNutritionTarget('waterLiters', value)}
          placeholder="2.5"
          keyboardType="decimal-pad"
        />
      </SectionCard>

      {/* ─── מאגר ארוחות של המאמנת ─── */}
      {coachMeals.length > 0 && (
        <SectionCard
          title="מאגר הארוחות שלי"
          subtitle="ארוחות שיצרת במאגר - לחצי להוסיף לתוכנית של הלקוחה"
          icon="heart-outline"
        >
          <Field
            label="חיפוש במאגר"
            value={coachMealQuery}
            onChangeText={setCoachMealQuery}
            placeholder="חפשי לפי שם ארוחה"
          />

          <View style={styles.recipeCategoryFilters}>
            {coachMealCategories.map(cat => {
              const isActive = cat === activeCoachMealCategory;
              const count =
                cat === 'הכל'
                  ? coachMeals.length
                  : coachMeals.filter(m => m.category === cat).length;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCoachMealCategory(cat)}
                  style={[styles.recipeCategoryChip, isActive && styles.recipeCategoryChipActive]}
                >
                  <Text
                    style={[
                      styles.recipeCategoryChipText,
                      isActive && styles.recipeCategoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                  <View
                    style={[
                      styles.recipeCategoryCount,
                      isActive && styles.recipeCategoryCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.recipeCategoryCountText,
                        isActive && styles.recipeCategoryCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.recipeList}>
            {filteredCoachMeals.length === 0 ? (
              <Text style={styles.emptyStateText}>לא נמצאו ארוחות שמתאימות לחיפוש.</Text>
            ) : (
              filteredCoachMeals.map(meal => (
                <View key={meal.id} style={styles.recipeCard}>
                  <View style={styles.recipeCardHeader}>
                    <View style={styles.recipeCaloriesPill}>
                      <Text style={styles.recipeCaloriesPillText}>
                        {meal.calories ? `${meal.calories} קל׳` : '—'}
                      </Text>
                    </View>
                    <View style={styles.recipeCardTitleWrap}>
                      <Text style={styles.recipeCardTitle}>{meal.title}</Text>
                      <Text style={styles.recipeCardMeta}>
                        {meal.category}
                        {meal.portion ? ` · ${meal.portion}` : ''}
                        {meal.protein != null ? ` · ח׳${meal.protein}ג׳` : ''}
                      </Text>
                    </View>
                  </View>

                  {meal.description ? (
                    <Text style={styles.recipeCardSummary}>{meal.description}</Text>
                  ) : null}

                  <View style={styles.recipeCardActions}>
                    <TouchableOpacity
                      onPress={() => addCoachMealToNutritionPlan(meal)}
                      style={styles.recipePrimaryBtn}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
                      <Text style={styles.recipePrimaryBtnText}>הוסיפי לתזונה</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </SectionCard>
      )}

      <SectionCard
        title="ספריית מתכונים מוכנים"
        subtitle="מתכונים שחולצו מהקובץ שהעלית, עם קלוריות משוערות לכל מנה"
        icon="book-outline"
      >
        <Field
          label="חיפוש מתכון"
          value={recipeQuery}
          onChangeText={setRecipeQuery}
          placeholder="חפשי לפי שם, קטגוריה או מרכיב"
        />

        <Text style={styles.recipeLibraryHint}>
          הקלוריות הן הערכה מקצועית לפי ספר המתכונים שהועלה. אפשר לעדכן ידנית אחרי ההוספה אם צריך.
        </Text>

        <View style={styles.summaryChipsRow}>
          <SummaryChip label="מתכונים" value={filteredRecipes.length} color={COLORS.primary} />
          <SummaryChip label="קטגוריה" value={activeRecipeCategory} color={COLORS.info} />
        </View>

        <View style={styles.recipeCategoryFilters}>
          {RECIPE_CATEGORIES.map(category => {
            const isActive = category === activeRecipeCategory;

            return (
              <TouchableOpacity
                key={category}
                onPress={() => setActiveRecipeCategory(category)}
                style={[styles.recipeCategoryChip, isActive && styles.recipeCategoryChipActive]}
              >
                <Text
                  style={[
                    styles.recipeCategoryChipText,
                    isActive && styles.recipeCategoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
                <View
                  style={[styles.recipeCategoryCount, isActive && styles.recipeCategoryCountActive]}
                >
                  <Text
                    style={[
                      styles.recipeCategoryCountText,
                      isActive && styles.recipeCategoryCountTextActive,
                    ]}
                  >
                    {recipeCategoryCounts[category] || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.recipeList}>
          {filteredRecipes.length === 0 ? (
            <Text style={styles.emptyStateText}>לא נמצאו מתכונים שמתאימים לחיפוש.</Text>
          ) : (
            groupedRecipes.map(group => (
              <View key={group.category} style={styles.recipeGroup}>
                <View style={styles.recipeGroupHeader}>
                  <View style={styles.recipeGroupCountPill}>
                    <Text style={styles.recipeGroupCountText}>{group.recipes.length}</Text>
                  </View>
                  <Text style={styles.recipeGroupTitle}>{group.category}</Text>
                </View>

                {group.recipes.map(recipe => (
                  <View key={recipe.id} style={styles.recipeCard}>
                    <View style={styles.recipeCardHeader}>
                      <View style={styles.recipeCaloriesPill}>
                        <Text style={styles.recipeCaloriesPillText}>
                          {recipe.caloriesPerServing} קל׳
                        </Text>
                      </View>
                      <View style={styles.recipeCardTitleWrap}>
                        <Text style={styles.recipeCardTitle}>{recipe.title}</Text>
                        <Text style={styles.recipeCardMeta}>
                          {recipe.category} · {recipe.portion} · {recipe.servings} מנות
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recipeCardSummary}>{recipe.summary}</Text>
                    <Text style={styles.recipeCardIngredients}>
                      {recipe.ingredients.slice(0, 4).join(' · ')}
                    </Text>

                    <View style={styles.recipeCardActions}>
                      <TouchableOpacity
                        onPress={() => showRecipeImagePrompt(recipe)}
                        style={styles.recipeSecondaryBtn}
                      >
                        <Ionicons name="image-outline" size={16} color={COLORS.info} />
                        <Text style={styles.recipeSecondaryBtnText}>פרומפט תמונה</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => addRecipeToNutritionPlan(recipe)}
                        style={styles.recipePrimaryBtn}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
                        <Text style={styles.recipePrimaryBtnText}>הוסיפי לתזונה</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="ארוחות"
        subtitle="הוספה ועריכה של ארוחות והפריטים שבתוכן"
        actionLabel="הוסיפי ארוחה"
        onActionPress={addMeal}
        icon="fast-food-outline"
      >
        {nutritionForm.meals.length === 0 ? (
          <Text style={styles.emptyStateText}>
            עדיין אין ארוחות בתוכנית התזונה. לחצי על הוסיפי ארוחה כדי להתחיל.
          </Text>
        ) : (
          nutritionForm.meals.map((meal, mealIndex) => (
            <View key={meal.id} style={styles.nestedCard}>
              <View style={styles.nestedCardHeader}>
                <TouchableOpacity onPress={() => removeMeal(meal.id)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.removeBtnText}>מחיקה</Text>
                </TouchableOpacity>
                <Text style={styles.nestedCardTitle}>ארוחה {mealIndex + 1}</Text>
              </View>

              <Field
                label="שם הארוחה"
                value={meal.name}
                onChangeText={value => updateMealField(meal.id, 'name', value)}
                placeholder="ארוחת בוקר"
              />
              <Field
                label="שעה"
                value={meal.time}
                onChangeText={value => updateMealField(meal.id, 'time', value)}
                placeholder="08:00"
              />
              <Field
                label="הערות לארוחה"
                value={meal.notes}
                onChangeText={value => updateMealField(meal.id, 'notes', value)}
                placeholder="למשל: אפשר להחליף לפי זמינות"
                multiline
              />

              <View style={styles.innerSectionHeader}>
                <TouchableOpacity onPress={() => addMealItem(meal.id)} style={styles.sectionAction}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.sectionActionText}>הוסיפי פריט</Text>
                </TouchableOpacity>
                <Text style={styles.innerSectionTitle}>פריטי הארוחה</Text>
              </View>

              {meal.items.length === 0 ? (
                <Text style={styles.emptyStateText}>אין עדיין פריטים בארוחה הזו.</Text>
              ) : (
                meal.items.map((item, itemIndex) => (
                  <View key={item.id} style={styles.innerCard}>
                    <View style={styles.nestedCardHeader}>
                      <TouchableOpacity
                        onPress={() => removeMealItem(meal.id, item.id)}
                        style={styles.removeBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.removeBtnText}>הסרה</Text>
                      </TouchableOpacity>
                      <Text style={styles.innerCardTitle}>פריט {itemIndex + 1}</Text>
                    </View>

                    <Field
                      label="שם הפריט"
                      value={item.name}
                      onChangeText={value => updateMealItemField(meal.id, item.id, 'name', value)}
                      placeholder="לדוגמה: יוגורט חלבון"
                    />
                    <Field
                      label="כמות"
                      value={item.amount}
                      onChangeText={value => updateMealItemField(meal.id, item.id, 'amount', value)}
                      placeholder="1 גביע / 150 גרם"
                    />

                    <Field
                      label="קישור לתמונה"
                      value={item.imageUrl}
                      onChangeText={value =>
                        updateMealItemField(meal.id, item.id, 'imageUrl', value)
                      }
                      placeholder="https://example.com/recipe.jpg"
                    />

                    {isValidHttpUrl(item.imageUrl) ? (
                      <View style={styles.itemImagePreviewWrap}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.itemImagePreview}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}

                    <View style={styles.twoColumns}>
                      <View style={styles.flexField}>
                        <Field
                          label="קלוריות"
                          value={item.calories}
                          onChangeText={value =>
                            updateMealItemField(meal.id, item.id, 'calories', value)
                          }
                          placeholder="140"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.flexField}>
                        <Field
                          label="חלבון"
                          value={item.protein}
                          onChangeText={value =>
                            updateMealItemField(meal.id, item.id, 'protein', value)
                          }
                          placeholder="20"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.twoColumns}>
                      <View style={styles.flexField}>
                        <Field
                          label="פחמימות"
                          value={item.carbs}
                          onChangeText={value =>
                            updateMealItemField(meal.id, item.id, 'carbs', value)
                          }
                          placeholder="8"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.flexField}>
                        <Field
                          label="שומן"
                          value={item.fat}
                          onChangeText={value =>
                            updateMealItemField(meal.id, item.id, 'fat', value)
                          }
                          placeholder="2"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <Field
                      label="הערות לפריט"
                      value={item.notes}
                      onChangeText={value => updateMealItemField(meal.id, item.id, 'notes', value)}
                      placeholder="חלופות, דרך הגשה או כל דגש נוסף"
                      multiline
                    />
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </SectionCard>
    </>
  );

  const renderWorkoutTab = () => (
    <>
      {renderPlanTemplateSection('workout')}

      <SectionCard
        title="פרטי תוכנית אימון"
        subtitle="מטרת התוכנית והדגשים המרכזיים"
        icon="barbell-outline"
      >
        <Field
          label="שם התוכנית"
          value={workoutForm.title}
          onChangeText={value => updateWorkoutField('title', value)}
          placeholder="תוכנית A/B לחיטוב"
        />
        <Field
          label="פוקוס התוכנית"
          value={workoutForm.goalFocus}
          onChangeText={value => updateWorkoutField('goalFocus', value)}
          placeholder="חיטוב, כוח, סבולת..."
        />
        <Field
          label="הערות כלליות"
          value={workoutForm.notes}
          onChangeText={value => updateWorkoutField('notes', value)}
          placeholder="דגשים לביצוע, אירובי בסוף אימון, ימי מנוחה..."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="יעדים שבועיים"
        subtitle="יעדים משלימים לתוכנית האימון"
        icon="speedometer-outline"
      >
        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <Field
              label="אימונים בשבוע"
              value={workoutForm.weeklyTargets.workouts}
              onChangeText={value => updateWorkoutTarget('workouts', value)}
              placeholder="4"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <Field
              label="דקות אירובי"
              value={workoutForm.weeklyTargets.cardioMinutes}
              onChangeText={value => updateWorkoutTarget('cardioMinutes', value)}
              placeholder="80"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Field
          label="יעד צעדים שבועי/יומי"
          value={workoutForm.weeklyTargets.steps}
          onChangeText={value => updateWorkoutTarget('steps', value)}
          placeholder="10000"
          keyboardType="numeric"
        />
      </SectionCard>

      <SectionCard
        title="ימי אימון"
        subtitle="בנייה של ימים ותרגילים לכל לקוחה"
        actionLabel="הוסיפי יום אימון"
        onActionPress={addWorkoutDay}
        icon="calendar-outline"
      >
        {workoutForm.days.length === 0 ? (
          <Text style={styles.emptyStateText}>
            עדיין אין ימים בתוכנית. לחצי על הוסיפי יום אימון כדי להתחיל.
          </Text>
        ) : (
          workoutForm.days.map((day, dayIndex) => (
            <View key={day.id} style={styles.nestedCard}>
              <View style={styles.nestedCardHeader}>
                <TouchableOpacity onPress={() => removeWorkoutDay(day.id)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.removeBtnText}>מחיקה</Text>
                </TouchableOpacity>
                <Text style={styles.nestedCardTitle}>יום {dayIndex + 1}</Text>
              </View>

              <Field
                label="שם היום"
                value={day.name}
                onChangeText={value => updateWorkoutDayField(day.id, 'name', value)}
                placeholder="יום A - רגליים"
              />
              <Field
                label="פוקוס"
                value={day.focus}
                onChangeText={value => updateWorkoutDayField(day.id, 'focus', value)}
                placeholder="פלג גוף תחתון"
              />
              <Field
                label="הערות ליום"
                value={day.notes}
                onChangeText={value => updateWorkoutDayField(day.id, 'notes', value)}
                placeholder="חימום, דגשים, אירובי בסיום"
                multiline
              />

              <View style={styles.innerSectionHeader}>
                <TouchableOpacity onPress={() => addExercise(day.id)} style={styles.sectionAction}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.sectionActionText}>הוסיפי תרגיל</Text>
                </TouchableOpacity>
                <Text style={styles.innerSectionTitle}>תרגילים</Text>
              </View>

              {day.exercises.length === 0 ? (
                <Text style={styles.emptyStateText}>אין עדיין תרגילים ביום הזה.</Text>
              ) : (
                day.exercises.map((exercise, exerciseIndex) => (
                  <View key={exercise.id} style={styles.innerCard}>
                    <View style={styles.nestedCardHeader}>
                      <TouchableOpacity
                        onPress={() => removeExercise(day.id, exercise.id)}
                        style={styles.removeBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.removeBtnText}>הסרה</Text>
                      </TouchableOpacity>
                      <Text style={styles.innerCardTitle}>תרגיל {exerciseIndex + 1}</Text>
                    </View>

                    <Field
                      label="שם התרגיל"
                      value={exercise.name}
                      onChangeText={value =>
                        updateExerciseField(day.id, exercise.id, 'name', value)
                      }
                      placeholder="סקוואט"
                    />
                    <Field
                      label="מזהה תרגיל חיצוני"
                      value={exercise.externalExerciseId}
                      onChangeText={value =>
                        updateExerciseField(day.id, exercise.id, 'externalExerciseId', value)
                      }
                      placeholder="ישמש בהמשך לחיבור לקטלוג"
                    />
                    <Field
                      label="קישור למדיה"
                      value={exercise.mediaUrl}
                      onChangeText={value =>
                        updateExerciseField(day.id, exercise.id, 'mediaUrl', value)
                      }
                      placeholder="קישור ל-GIF או וידאו בהמשך"
                    />

                    <View style={styles.twoColumns}>
                      <View style={styles.flexField}>
                        <Field
                          label="סטים"
                          value={exercise.sets}
                          onChangeText={value =>
                            updateExerciseField(day.id, exercise.id, 'sets', value)
                          }
                          placeholder="4"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.flexField}>
                        <Field
                          label="חזרות"
                          value={exercise.reps}
                          onChangeText={value =>
                            updateExerciseField(day.id, exercise.id, 'reps', value)
                          }
                          placeholder="12"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.twoColumns}>
                      <View style={styles.flexField}>
                        <Field
                          label="מנוחה בשניות"
                          value={exercise.restSeconds}
                          onChangeText={value =>
                            updateExerciseField(day.id, exercise.id, 'restSeconds', value)
                          }
                          placeholder="75"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.flexField}>
                        <Field
                          label="משך בשניות"
                          value={exercise.durationSeconds}
                          onChangeText={value =>
                            updateExerciseField(day.id, exercise.id, 'durationSeconds', value)
                          }
                          placeholder="רק אם התרגיל לפי זמן"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <Field
                      label="הערות לתרגיל"
                      value={exercise.notes}
                      onChangeText={value =>
                        updateExerciseField(day.id, exercise.id, 'notes', value)
                      }
                      placeholder="טכניקה, עומס, אלטרנטיבות"
                      multiline
                    />
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </SectionCard>
    </>
  );

  const renderHabitsTab = () => {
    const activeHabits = habitForm.filter(habit => habit.isActive);
    const dailyHabits = activeHabits.filter(habit => habit.frequency === 'daily');
    const weeklyHabits = activeHabits.filter(habit => habit.frequency === 'weekly');

    return (
      <>
        <SectionCard
          title="הרגלים ומשימות"
          subtitle="המאמנת מגדירה מעקב יומי או שבועי שהלקוחה יכולה לסמן באפליקציה"
          actionLabel="הוסיפי הרגל"
          onActionPress={addHabit}
          icon="checkbox-outline"
        >
          <View style={styles.summaryChipsRow}>
            <SummaryChip label="פעילים" value={activeHabits.length} color={COLORS.primary} />
            <SummaryChip label="יומיים" value={dailyHabits.length} color={COLORS.info} />
            <SummaryChip label="שבועיים" value={weeklyHabits.length} color={COLORS.accent} />
          </View>

          {habitForm.length === 0 ? (
            <Text style={styles.emptyStateText}>
              עדיין לא הוגדרו הרגלים. הוסיפי משימות כמו מים, צעדים, חלבון או הליכות.
            </Text>
          ) : (
            habitForm.map((habit, habitIndex) => (
              <View key={habit.id} style={styles.innerCard}>
                <View style={styles.nestedCardHeader}>
                  <TouchableOpacity onPress={() => removeHabit(habit.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.removeBtnText}>הסרה</Text>
                  </TouchableOpacity>
                  <Text style={styles.innerCardTitle}>הרגל {habitIndex + 1}</Text>
                </View>

                <Field
                  label="שם ההרגל"
                  value={habit.title}
                  onChangeText={value => updateHabitField(habit.id, 'title', value)}
                  placeholder="למשל: 2 ליטר מים ביום"
                />

                <View style={styles.twoColumns}>
                  <View style={styles.flexField}>
                    <Field
                      label="יעד כמות"
                      value={habit.targetCount}
                      onChangeText={value => updateHabitField(habit.id, 'targetCount', value)}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>תדירות</Text>
                    <View style={styles.choiceChipsRow}>
                      {HABIT_FREQUENCY_OPTIONS.map(option => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.choiceChip,
                            habit.frequency === option.id && styles.choiceChipActive,
                          ]}
                          onPress={() => updateHabitField(habit.id, 'frequency', option.id)}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              habit.frequency === option.id && styles.choiceChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Field
                  label="הערות ללקוחה"
                  value={habit.notes}
                  onChangeText={value => updateHabitField(habit.id, 'notes', value)}
                  placeholder="מה בדיוק לסמן, דגשים או תזכורת קצרה"
                  multiline
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>מצב הרגל</Text>
                  <View style={styles.accountStatusRow}>
                    <TouchableOpacity
                      style={[
                        styles.accountStatusBtn,
                        habit.isActive && styles.accountStatusBtnActive,
                      ]}
                      onPress={() => updateHabitField(habit.id, 'isActive', true)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={habit.isActive ? COLORS.success : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.accountStatusBtnText,
                          habit.isActive && styles.accountStatusBtnTextActive,
                        ]}
                      >
                        פעיל
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.accountStatusBtn,
                        !habit.isActive && styles.accountStatusBtnInactive,
                      ]}
                      onPress={() => updateHabitField(habit.id, 'isActive', false)}
                    >
                      <Ionicons
                        name="pause-circle-outline"
                        size={18}
                        color={!habit.isActive ? COLORS.warning : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.accountStatusBtnText,
                          !habit.isActive && styles.accountStatusBtnTextInactive,
                        ]}
                      >
                        מושהה
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </SectionCard>
      </>
    );
  };

  const renderCheckInTab = () => {
    const requiredQuestions = checkInTemplateForm.questions.filter(question => question.required);

    return (
      <>
        <SectionCard
          title="טופס צ׳ק-אין שבועי"
          subtitle="בני טופס שהלקוחה ממלאת מתוך האפליקציה. ההגשה הראשונה של כל שבוע מגיעה גם לעדכונים."
          actionLabel="הוסיפי שאלה"
          onActionPress={addCheckInQuestion}
          icon="clipboard-outline"
        >
          <Field
            label="כותרת הטופס"
            value={checkInTemplateForm.title}
            onChangeText={value => updateCheckInTemplateField('title', value)}
            placeholder="למשל: צ׳ק-אין שבועי לשלהבת"
          />
          <Field
            label="פתיח ללקוחה"
            value={checkInTemplateForm.intro}
            onChangeText={value => updateCheckInTemplateField('intro', value)}
            placeholder="כתבי הנחיה קצרה למה חשוב להתייחס במילוי"
            multiline
          />

          <View style={styles.summaryChipsRow}>
            <SummaryChip
              label="שאלות"
              value={checkInTemplateForm.questions.length}
              color={COLORS.primary}
            />
            <SummaryChip label="חובה" value={requiredQuestions.length} color={COLORS.info} />
            <SummaryChip
              label="סטטוס"
              value={checkInTemplateForm.questions.length > 0 ? 'מוכן' : 'טיוטה'}
              color={COLORS.accent}
            />
          </View>

          {checkInTemplateForm.questions.length === 0 ? (
            <Text style={styles.emptyStateText}>
              עדיין אין שאלות. הוסיפי שאלות כמו משקל, היענות, שינה, אנרגיה או קושי עיקרי.
            </Text>
          ) : (
            checkInTemplateForm.questions.map((question, questionIndex) => (
              <View key={question.id} style={styles.innerCard}>
                <View style={styles.nestedCardHeader}>
                  <TouchableOpacity
                    onPress={() => removeCheckInQuestion(question.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.removeBtnText}>הסרה</Text>
                  </TouchableOpacity>
                  <Text style={styles.innerCardTitle}>שאלה {questionIndex + 1}</Text>
                </View>

                <Field
                  label="טקסט השאלה"
                  value={question.label}
                  onChangeText={value => updateCheckInQuestionField(question.id, 'label', value)}
                  placeholder="למשל: איך הרגשת השבוע?"
                />

                <Text style={styles.fieldLabel}>סוג תשובה</Text>
                <View style={styles.choiceChipsWrap}>
                  {CHECK_IN_QUESTION_TYPES.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.choiceChip,
                        question.type === option.id && styles.choiceChipActive,
                      ]}
                      onPress={() => updateCheckInQuestionField(question.id, 'type', option.id)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          question.type === option.id && styles.choiceChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Field
                  label="Placeholder"
                  value={question.placeholder}
                  onChangeText={value =>
                    updateCheckInQuestionField(question.id, 'placeholder', value)
                  }
                  placeholder="טקסט עזר קצר בתוך השדה"
                />
                <Field
                  label="טקסט עזר"
                  value={question.helperText}
                  onChangeText={value =>
                    updateCheckInQuestionField(question.id, 'helperText', value)
                  }
                  placeholder="לדוגמה: צייני מספר מדויק אם אפשר"
                  multiline
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>חובה למילוי</Text>
                  <View style={styles.accountStatusRow}>
                    <TouchableOpacity
                      style={[
                        styles.accountStatusBtn,
                        question.required && styles.accountStatusBtnActive,
                      ]}
                      onPress={() => updateCheckInQuestionField(question.id, 'required', true)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={question.required ? COLORS.success : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.accountStatusBtnText,
                          question.required && styles.accountStatusBtnTextActive,
                        ]}
                      >
                        חובה
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.accountStatusBtn,
                        !question.required && styles.accountStatusBtnInactive,
                      ]}
                      onPress={() => updateCheckInQuestionField(question.id, 'required', false)}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={18}
                        color={!question.required ? COLORS.warning : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.accountStatusBtnText,
                          !question.required && styles.accountStatusBtnTextInactive,
                        ]}
                      >
                        אופציונלי
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="הצ׳ק-אין האחרון שהוגש"
          subtitle="תצוגה מהירה של הטופס האחרון שהלקוחה שלחה"
          icon="document-text-outline"
        >
          {!latestCheckInEntry ? (
            <Text style={styles.emptyStateText}>עדיין לא נשלח צ׳ק-אין מצד הלקוחה.</Text>
          ) : (
            <>
              <View style={styles.summaryChipsRow}>
                <SummaryChip
                  label="שבוע"
                  value={latestCheckInEntry.weekKey}
                  color={COLORS.primary}
                />
                <SummaryChip
                  label="תשובות"
                  value={latestCheckInEntry.answers?.length || 0}
                  color={COLORS.info}
                />
                <SummaryChip
                  label="נשלח"
                  value={String(latestCheckInEntry.submittedAt || '').slice(0, 10) || '—'}
                  color={COLORS.accent}
                />
              </View>

              {(latestCheckInEntry.answers || []).map(answer => (
                <View key={answer.questionId} style={styles.readonlyAnswerRow}>
                  <Text style={styles.readonlyAnswerValue}>{formatCheckInAnswerValue(answer)}</Text>
                  <Text style={styles.readonlyAnswerLabel}>{answer.label}</Text>
                </View>
              ))}

              {latestCheckInEntry.note ? (
                <View style={styles.readonlyAnswerNoteBox}>
                  <Text style={styles.readonlyAnswerNote}>{latestCheckInEntry.note}</Text>
                </View>
              ) : null}
            </>
          )}
        </SectionCard>
      </>
    );
  };

  const getSaveLabel = () => {
    if (activeTab === 'account') return 'שמרי חשבון';
    if (activeTab === 'goals') return 'שמרי יעדים';
    if (activeTab === 'nutrition') return 'שמרי תזונה';
    if (activeTab === 'workout') return 'שמרי אימון';
    if (activeTab === 'habits') return 'שמרי הרגלים';
    if (activeTab === 'checkin') return 'שמרי צ׳ק-אין';
    return 'שמרי תוכנית';
  };

  const handleTabPress = tabId => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
    setActiveTab(tabId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.editorSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.modalTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>ניהול לקוחה</Text>
              <Text style={styles.modalSub}>חשבון, יעדים, תזונה, יומן אכילה ותוכנית אימון</Text>
            </View>
            <View style={styles.headerIconBtn} />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>טוען את פרטי הלקוחה...</Text>
            </View>
          ) : (
            <>
              <View style={styles.tabsRow}>
                {TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                    onPress={() => handleTabPress(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text
                      style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView
                ref={contentScrollRef}
                style={styles.contentScroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={KEYBOARD_DISMISS_MODE}
              >
                <View style={[styles.clientHero, styles.clientHeroScrollable]}>
                  <View style={styles.clientHeroHeader}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: client?.isActive ? '#2E7D3233' : '#B71C1C33' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: client?.isActive ? '#4CAF50' : '#F44336' },
                        ]}
                      >
                        {client?.isActive ? 'לקוחה פעילה' : 'לא פעילה'}
                      </Text>
                    </View>
                    <View style={styles.clientHeroText}>
                      <Text style={styles.clientHeroName}>{client?.name || ''}</Text>
                      <Text style={styles.clientHeroSub}>{client?.email || ''}</Text>
                      <Text style={styles.clientHeroSub}>{client?.phone || 'ללא מספר טלפון'}</Text>
                    </View>
                  </View>
                  <View style={styles.summaryChipsRow}>
                    <SummaryChip
                      label="משקל"
                      value={client?.weight ? `${client.weight} ק"ג` : '—'}
                      color={COLORS.primary}
                    />
                    <SummaryChip
                      label="מטרה כללית"
                      value={client?.goal || '—'}
                      color={COLORS.accent}
                    />
                    <SummaryChip
                      label="גובה"
                      value={client?.height ? `${client.height} ס"מ` : '—'}
                      color={COLORS.info}
                    />
                  </View>
                </View>

                {activeTab === 'account' ? renderAccountTab() : null}
                {activeTab === 'goals' ? renderGoalsTab() : null}
                {activeTab === 'nutrition' ? renderNutritionTab() : null}
                {activeTab === 'workout' ? renderWorkoutTab() : null}
                {activeTab === 'habits' ? renderHabitsTab() : null}
                {activeTab === 'checkin' ? renderCheckInTab() : null}
              </ScrollView>

              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>סגירה</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{getSaveLabel()}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>

          <CoachFoodDiaryEditorModal
            visible={foodDiaryEditorVisible}
            entry={editingFoodDiaryEntry}
            saving={foodDiarySaving}
            onClose={() => {
              if (!foodDiarySaving) setFoodDiaryEditorVisible(false);
            }}
            onSave={handleSaveFoodDiary}
          />
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

/* eslint-disable react-native/sort-styles */
const styles = StyleSheet.create({
  accountInfoBox: {
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.info}14`,
    borderColor: `${COLORS.info}33`,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    padding: 12,
  },
  accountInfoText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  accountStatusBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  accountStatusBtnActive: {
    backgroundColor: `${COLORS.success}18`,
    borderColor: `${COLORS.success}44`,
  },
  accountStatusBtnInactive: {
    backgroundColor: `${COLORS.warning}18`,
    borderColor: `${COLORS.warning}44`,
  },
  accountStatusBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  accountStatusBtnTextActive: {
    color: COLORS.success,
  },
  accountStatusBtnTextInactive: {
    color: COLORS.warning,
  },
  accountStatusRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  automationBanner: {
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
    padding: 12,
  },
  automationBannerContent: {
    flex: 1,
  },
  automationBannerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'right',
  },
  automationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  automationReasonRow: {
    alignItems: 'flex-start',
    flexDirection: 'row-reverse',
    gap: 8,
  },
  automationReasonText: {
    color: COLORS.white,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  automationReasonsList: {
    gap: 8,
    marginTop: 12,
  },
  automationReminderBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  automationReminderBtnDisabled: {
    backgroundColor: COLORS.borderLight,
  },
  automationReminderBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  automationReminderPreview: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  automationReminderPreviewLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'right',
  },
  automationReminderPreviewText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
  },
  quickMessageFooterText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'right',
  },
  quickMessagePreview: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  quickMessagePreviewLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'right',
  },
  quickMessagePreviewText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
  },
  quickMessagePreviewTextPlaceholder: {
    color: COLORS.textMuted,
  },
  quickMessageSaveBtn: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickMessageSaveBtnDisabled: {
    opacity: 0.65,
  },
  quickMessageSaveBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  quickMessageSendBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickMessageSendBtnDisabled: {
    backgroundColor: COLORS.borderLight,
  },
  quickMessageSendBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  templateActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  templateActionBtnDisabled: {
    opacity: 0.6,
  },
  templateActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  templateActionPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  templateActionPrimaryBtnText: {
    color: COLORS.white,
  },
  templateActionRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
  },
  templateActionSecondaryBtn: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.primary,
  },
  templateActionSecondaryBtnText: {
    color: COLORS.primary,
  },
  templateSummaryBox: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  templateSummaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'right',
  },
  templateSummaryMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'right',
  },
  templateSummaryText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
  },
  templateSummaryTextMuted: {
    color: COLORS.textMuted,
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  clientHero: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  clientHeroScrollable: {
    marginBottom: 0,
  },
  clientHeroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientHeroName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  clientHeroSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  clientHeroText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  contentContainer: {
    gap: 12,
    paddingBottom: 12,
  },
  contentScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  editorSheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    maxHeight: '95%',
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  emptyStateText: {
    color: COLORS.textMuted,
    fontSize: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'right',
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: -4,
    marginBottom: 8,
    textAlign: 'right',
  },
  hiddenPinnedMenuExportCard: {
    height: PINNED_MENU_EXPORT_HEIGHT,
    width: PINNED_MENU_EXPORT_WIDTH,
  },
  hiddenPinnedMenuExportSurface: {
    height: PINNED_MENU_EXPORT_HEIGHT,
    width: PINNED_MENU_EXPORT_WIDTH,
  },
  hiddenPinnedMenuExportWrap: {
    left: -10000,
    position: 'absolute',
    top: 0,
  },
  pinnedMenuActionRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  pinnedMenuCaptureSurface: {
    width: '100%',
  },
  pinnedMenuClearBtn: {
    borderColor: `${COLORS.danger}44`,
  },
  pinnedMenuClearBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedMenuModeCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    padding: 14,
  },
  pinnedMenuModeCardActive: {
    backgroundColor: `${COLORS.primary}14`,
    borderColor: `${COLORS.primary}55`,
  },
  pinnedMenuModeIcon: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pinnedMenuModeIconAuto: {
    backgroundColor: `${COLORS.primary}18`,
  },
  pinnedMenuModeIconFreeform: {
    backgroundColor: `${COLORS.info}18`,
  },
  pinnedMenuModeRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 12,
    marginTop: 12,
  },
  pinnedMenuModeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  pinnedMenuModeTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  pinnedMenuModeTitleActive: {
    color: COLORS.primary,
  },
  pinnedMenuPreviewWrap: {
    gap: 8,
    marginTop: 12,
  },
  pinnedMenuSecondaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pinnedMenuSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedMenuShareBtnText: {
    color: COLORS.info,
  },
  flexField: {
    flex: 1,
  },
  foodDiaryDayCalories: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  foodDiaryDayCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  foodDiaryDayDate: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  foodDiaryDayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  foodDiaryDayMeals: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  foodDiaryDayMeta: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 8,
  },
  foodDiaryDayMetaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  foodDiaryEditBtn: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 10,
  },
  foodDiaryEditBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  headerIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  innerCard: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  innerCardTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  choiceChipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  choiceChip: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: COLORS.primary,
  },
  choiceChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: COLORS.primary,
  },
  innerSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  innerSectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputMultiline: {
    minHeight: 92,
  },
  itemImagePreview: {
    backgroundColor: COLORS.card,
    height: 160,
    width: '100%',
  },
  itemImagePreviewWrap: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  readonlyAnswerLabel: {
    color: COLORS.white,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  readonlyAnswerNote: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  readonlyAnswerNoteBox: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  readonlyAnswerRow: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  readonlyAnswerValue: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 44,
  },
  modalHeaderText: {
    alignItems: 'center',
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nestedCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  nestedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nestedCardTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flex: 2,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  recipeCaloriesPill: {
    backgroundColor: `${COLORS.primary}1F`,
    borderColor: `${COLORS.primary}55`,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recipeCaloriesPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  recipeCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  recipeCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  recipeCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  recipeCardIngredients: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'right',
  },
  recipeCardMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'right',
  },
  recipeCardSummary: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'right',
  },
  recipeCardTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  recipeCardTitleWrap: {
    alignItems: 'flex-end',
    flex: 1,
  },
  recipeCategoryChip: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recipeCategoryChipActive: {
    backgroundColor: `${COLORS.primary}18`,
    borderColor: `${COLORS.primary}55`,
  },
  recipeCategoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  recipeCategoryChipTextActive: {
    color: COLORS.primary,
  },
  recipeCategoryCount: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  recipeCategoryCountActive: {
    backgroundColor: `${COLORS.primary}26`,
  },
  recipeCategoryCountText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  recipeCategoryCountTextActive: {
    color: COLORS.primary,
  },
  recipeCategoryFilters: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  recipeGroup: {
    gap: 10,
  },
  recipeGroupCountPill: {
    alignItems: 'center',
    backgroundColor: `${COLORS.info}22`,
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recipeGroupCountText: {
    color: COLORS.info,
    fontSize: 11,
    fontWeight: '700',
  },
  recipeGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  recipeGroupTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  recipeLibraryHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    textAlign: 'right',
  },
  recipeList: {
    gap: 10,
  },
  recipePrimaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  recipePrimaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  recipeSecondaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  recipeSecondaryBtnText: {
    color: COLORS.info,
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sectionActionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 3,
    textAlign: 'right',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryChip: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  summaryChipLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryChipValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  tabBtnActive: {
    backgroundColor: `${COLORS.primary}22`,
  },
  tabBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },
  tabsRow: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    padding: 4,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
});
/* eslint-enable react-native/sort-styles */
