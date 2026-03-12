export const FOOD_DIARY_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const FOOD_DIARY_MEAL_LABELS = {
  breakfast: 'ארוחת בוקר',
  lunch: 'ארוחת צהריים',
  dinner: 'ארוחת ערב',
  snacks: 'נשנושים',
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getFoodDiaryDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const day = value.getDate().toString().padStart(2, '0');
  const month = (value.getMonth() + 1).toString().padStart(2, '0');
  const year = value.getFullYear();
  return `${year}-${month}-${day}`;
}

export function createEmptyFoodDiaryMeals() {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  };
}

export function getFoodDiaryMealLabel(mealType) {
  return FOOD_DIARY_MEAL_LABELS[mealType] || 'ארוחה';
}

export function normalizeFoodDiaryItem(item = {}, mealType = 'snacks', index = 0) {
  return {
    id: item.id || `food-diary-${mealType}-${index + 1}`,
    name: item.name || 'פריט מזון',
    portion: typeof item.portion === 'string' ? item.portion : '',
    calories: toNumber(item.calories),
    protein: toNumber(item.protein),
    carbs: toNumber(item.carbs),
    fat: toNumber(item.fat),
    source: typeof item.source === 'string' ? item.source : '',
    photoUri: typeof item.photoUri === 'string' ? item.photoUri : '',
  };
}

export function normalizeFoodDiaryMeals(meals = {}) {
  const source = meals && typeof meals === 'object' ? meals : {};

  return FOOD_DIARY_MEAL_TYPES.reduce((accumulator, mealType) => {
    accumulator[mealType] = Array.isArray(source[mealType])
      ? source[mealType].map((item, index) => normalizeFoodDiaryItem(item, mealType, index))
      : [];
    return accumulator;
  }, createEmptyFoodDiaryMeals());
}

export function calculateFoodDiaryTotals(meals = {}) {
  const normalizedMeals = normalizeFoodDiaryMeals(meals);
  const items = FOOD_DIARY_MEAL_TYPES.flatMap(mealType => normalizedMeals[mealType]);

  return {
    calories: items.reduce((sum, item) => sum + toNumber(item.calories), 0),
    protein: items.reduce((sum, item) => sum + toNumber(item.protein), 0),
    carbs: items.reduce((sum, item) => sum + toNumber(item.carbs), 0),
    fat: items.reduce((sum, item) => sum + toNumber(item.fat), 0),
  };
}

export function normalizeFoodDiaryEntry(entry, fallbackDate = getFoodDiaryDateKey()) {
  const meals = normalizeFoodDiaryMeals(entry?.meals || entry);

  return {
    id: entry?.id || null,
    date: typeof entry?.date === 'string' ? entry.date : fallbackDate,
    meals,
    totals: calculateFoodDiaryTotals(meals),
    createdAt: entry?.createdAt || null,
    updatedAt: entry?.updatedAt || null,
  };
}