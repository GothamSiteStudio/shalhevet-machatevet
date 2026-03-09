import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { coachAPI } from '../services/api';

const TABS = [
  { id: 'goals', label: 'יעדים', icon: 'flag-outline' },
  { id: 'nutrition', label: 'תפריט', icon: 'restaurant-outline' },
  { id: 'workout', label: 'אימונים', icon: 'barbell-outline' },
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function createEmptyMealItem() {
  return {
    id: makeId('meal-item'),
    name: '',
    amount: '',
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
    meals: [],
  };
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
    meals: form.meals.map(meal => ({
      id: meal.id,
      name: meal.name.trim(),
      time: meal.time.trim(),
      notes: meal.notes.trim(),
      items: meal.items.map(item => ({
        id: item.id,
        name: item.name.trim(),
        amount: item.amount.trim(),
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
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);
  const [goalsForm, setGoalsForm] = useState(createEmptyGoalsForm());
  const [nutritionForm, setNutritionForm] = useState(createEmptyNutritionForm());
  const [workoutForm, setWorkoutForm] = useState(createEmptyWorkoutForm());

  const resetForms = useCallback(() => {
    setClient(null);
    setGoalsForm(createEmptyGoalsForm());
    setNutritionForm(createEmptyNutritionForm());
    setWorkoutForm(createEmptyWorkoutForm());
  }, []);

  const loadClient = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const result = await coachAPI.getClient(clientId);
      setClient(result.client || null);
      setGoalsForm(mapGoalsToForm(result.goals));
      setNutritionForm(mapNutritionToForm(result.nutritionPlan));
      setWorkoutForm(mapWorkoutToForm(result.workoutPlan));
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

  const updateGoalField = (field, value) => {
    setGoalsForm(current => ({ ...current, [field]: value }));
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

  const updateWorkoutField = (field, value) => {
    setWorkoutForm(current => ({ ...current, [field]: value }));
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

    setSaving(true);
    try {
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
        Alert.alert('✅ נשמר', 'התפריט האישי עודכן בהצלחה');
      }

      if (activeTab === 'workout') {
        const result = await coachAPI.updateClientWorkoutPlan(
          clientId,
          serializeWorkout(workoutForm)
        );
        setWorkoutForm(mapWorkoutToForm(result.workoutPlan));
        Alert.alert('✅ נשמר', 'תוכנית האימון עודכנה בהצלחה');
      }

      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את השינויים');
    } finally {
      setSaving(false);
    }
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

  const renderNutritionTab = () => (
    <>
      <SectionCard
        title="פרטי תפריט"
        subtitle="שם לתפריט, הערות ודגשים יומיים"
        icon="restaurant-outline"
      >
        <Field
          label="שם התפריט"
          value={nutritionForm.title}
          onChangeText={value => updateNutritionField('title', value)}
          placeholder="תפריט חיטוב אישי"
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

      <SectionCard
        title="ארוחות"
        subtitle="הוספה ועריכה של ארוחות והפריטים שבתוכן"
        actionLabel="הוסיפי ארוחה"
        onActionPress={addMeal}
        icon="fast-food-outline"
      >
        {nutritionForm.meals.length === 0 ? (
          <Text style={styles.emptyStateText}>
            עדיין אין ארוחות בתפריט. לחצי על הוסיפי ארוחה כדי להתחיל.
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

  const getSaveLabel = () => {
    if (activeTab === 'goals') return 'שמרי יעדים';
    if (activeTab === 'nutrition') return 'שמרי תפריט';
    return 'שמרי תוכנית';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.editorSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.modalTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>ניהול לקוחה</Text>
              <Text style={styles.modalSub}>יעדים, תפריט אישי ותוכנית אימון</Text>
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
              <View style={styles.clientHero}>
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

              <View style={styles.tabsRow}>
                {TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab.id)}
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
                style={styles.contentScroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === 'goals' ? renderGoalsTab() : null}
                {activeTab === 'nutrition' ? renderNutritionTab() : null}
                {activeTab === 'workout' ? renderWorkoutTab() : null}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    flexGrow: 0,
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
  flexField: {
    flex: 1,
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
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
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
