import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';
import { usersAPI } from '../services/api';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRemoteImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());
}

function calculateCaloriesFromMacros(protein, carbs, fat) {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

function normalizeMealItem(item, index) {
  const protein = toNumber(item?.protein);
  const carbs = toNumber(item?.carbs);
  const fat = toNumber(item?.fat);
  const calories =
    item?.calories === undefined || item?.calories === null || item?.calories === ''
      ? calculateCaloriesFromMacros(protein, carbs, fat)
      : toNumber(item.calories);

  return {
    id: item?.id || `meal-item-${index + 1}`,
    name: item?.name || 'פריט תזונתי',
    portion: item?.amount || item?.portion || '',
    notes: item?.notes || '',
    imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '',
    calories,
    protein,
    carbs,
    fat,
  };
}

function normalizeMeal(meal, index) {
  return {
    id: meal?.id || `meal-${index + 1}`,
    name: meal?.name || `ארוחה ${index + 1}`,
    time: meal?.time || '',
    notes: meal?.notes || '',
    items: Array.isArray(meal?.items) ? meal.items.map(normalizeMealItem) : [],
  };
}

function normalizeNutritionPlan(plan) {
  if (!plan) return null;

  return {
    title: plan.title || 'תפריט אישי',
    notes: plan.notes || '',
    dailyTargets: {
      calories: toNumber(plan.dailyTargets?.calories),
      protein: toNumber(plan.dailyTargets?.protein),
      carbs: toNumber(plan.dailyTargets?.carbs),
      fat: toNumber(plan.dailyTargets?.fat),
      waterLiters: toNumber(plan.dailyTargets?.waterLiters),
    },
    meals: Array.isArray(plan.meals) ? plan.meals.map(normalizeMeal) : [],
  };
}

function calculatePlanTotals(meals) {
  const allItems = meals.flatMap(meal => meal.items || []);

  return {
    calories: allItems.reduce((sum, item) => sum + toNumber(item.calories), 0),
    protein: allItems.reduce((sum, item) => sum + toNumber(item.protein), 0),
    carbs: allItems.reduce((sum, item) => sum + toNumber(item.carbs), 0),
    fat: allItems.reduce((sum, item) => sum + toNumber(item.fat), 0),
  };
}

function MealCard({ meal, mealKey, dailyCalorieTarget, onAddItem }) {
  const [expanded, setExpanded] = useState(false);
  const mealTotals = calculatePlanTotals([meal]);
  const mealImage = meal.items.find(item => isRemoteImageUrl(item.imageUrl))?.imageUrl;
  const pct =
    dailyCalorieTarget > 0 ? Math.min((mealTotals.calories / dailyCalorieTarget) * 100, 100) : 0;

  return (
    <View style={styles.mealCard}>
      <TouchableOpacity style={styles.mealHeader} onPress={() => setExpanded(!expanded)}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textSecondary}
        />
        <View style={styles.mealHeaderRight}>
          <View style={styles.mealHeaderTextWrap}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealHeaderMeta}>
              {meal.time ? `${meal.time} · ` : ''}
              {Math.round(mealTotals.calories)} קל׳
            </Text>
          </View>
          {mealImage ? (
            <Image source={{ uri: mealImage }} style={styles.mealHeaderImage} resizeMode="cover" />
          ) : (
            <View style={styles.mealHeaderImageFallback}>
              <Ionicons name="restaurant-outline" size={18} color={COLORS.textMuted} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {dailyCalorieTarget > 0 ? (
        <View style={styles.mealProgressBg}>
          <View style={[styles.mealProgressFill, { width: `${pct}%` }]} />
        </View>
      ) : null}
      <Text style={styles.mealProgressLabel}>
        {dailyCalorieTarget > 0
          ? `${Math.round(mealTotals.calories)} / ${Math.round(dailyCalorieTarget)} קל׳ מהיעד היומי`
          : meal.notes || `${meal.items.length} פריטים בארוחה`}
      </Text>

      {expanded && (
        <View style={styles.mealBody}>
          {meal.notes ? <Text style={styles.mealNote}>{meal.notes}</Text> : null}
          {meal.items.map(item => (
            <View key={item.id} style={styles.mealItem}>
              {isRemoteImageUrl(item.imageUrl) ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.mealItemImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mealItemImageFallback}>
                  <Ionicons name="image-outline" size={18} color={COLORS.textMuted} />
                </View>
              )}
              <View style={styles.mealItemRight}>
                <Text style={styles.mealItemName}>{item.name}</Text>
                {item.portion ? <Text style={styles.mealItemPortion}>{item.portion}</Text> : null}
                {item.notes ? <Text style={styles.mealItemNotes}>{item.notes}</Text> : null}
              </View>
              <View style={styles.mealItemMeta}>
                <Text style={styles.mealItemCalories}>{Math.round(item.calories)} קל׳</Text>
                {toNumber(item.protein) > 0 ||
                toNumber(item.carbs) > 0 ||
                toNumber(item.fat) > 0 ? (
                  <View style={styles.mealItemMacros}>
                    <View style={[styles.macroBadge, { backgroundColor: '#1565C044' }]}>
                      <Text style={[styles.macroText, { color: '#42A5F5' }]}>
                        נ {item.protein.toFixed(1)}
                      </Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: '#E6510044' }]}>
                      <Text style={[styles.macroText, { color: '#FFA726' }]}>
                        פ {item.carbs.toFixed(1)}
                      </Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: '#D32F2F44' }]}>
                      <Text style={[styles.macroText, { color: '#EF5350' }]}>
                        ש {item.fat.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={() => onAddItem(mealKey)}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.addItemText}>הוסף ל{meal.name}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function AIModal({ visible, onClose, onAction }) {
  const actions = [
    { id: 'photo', icon: 'camera', label: 'הוסף ארוחה בצילום', color: '#42A5F5' },
    { id: 'ask', icon: 'chatbubble-ellipses', label: 'שאל AI על הארוחה', color: '#AB47BC' },
    { id: 'recipe', icon: 'restaurant', label: 'בניית מתכון מ-AI', color: '#66BB6A' },
    { id: 'alt', icon: 'swap-horizontal', label: 'חלופה לארוחה ב-AI', color: '#FFA726' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.aiOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.aiSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.aiTitle}>✨ פעולות AI</Text>
          <Text style={styles.aiSubtitle}>מה תרצי לעשות?</Text>
          {actions.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.aiAction, { borderColor: a.color + '44' }]}
              onPress={() => {
                onAction(a.id);
                onClose();
              }}
            >
              <View style={[styles.aiActionIcon, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.aiActionText}>{a.label}</Text>
              <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function NutritionScreen({ navigation }) {
  const { waterIntake, waterGoal, setWaterGoal, setWaterIntake } = useStore();
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showAI, setShowAI] = useState(false);

  const loadNutritionPlan = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await usersAPI.getNutritionPlan();
        const plan = normalizeNutritionPlan(result.nutritionPlan);
        setNutritionPlan(plan);
        setLoadError('');

        if (plan?.dailyTargets?.waterLiters > 0) {
          setWaterGoal(plan.dailyTargets.waterLiters);
        }
      } catch (err) {
        setNutritionPlan(null);
        setLoadError(err.message || 'לא ניתן לטעון את התפריט האישי כרגע');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setWaterGoal]
  );

  useFocusEffect(
    useCallback(() => {
      loadNutritionPlan();
    }, [loadNutritionPlan])
  );

  const handleAIAction = id => {
    const msgs = {
      photo: 'פיצ׳ר זיהוי תמונה יהיה זמין בקרוב! 📸',
      ask: 'הצ׳אט עם AI יהיה זמין בקרוב! 🤖',
      recipe: 'בניית מתכונים ב-AI יהיה זמין בקרוב! 🍳',
      alt: 'הצעות חלופיות ב-AI יהיו זמינות בקרוב! 🔄',
    };
    Alert.alert('✨ בקרוב!', msgs[id] || 'פיצ׳ר זה יהיה זמין בקרוב');
  };

  const handleAddItem = mealKey => {
    Alert.alert('הוסף פריט', 'פיצ׳ר הוספת פריטים ידנית יהיה זמין בקרוב');
  };

  const meals = nutritionPlan?.meals || [];
  const totals = calculatePlanTotals(meals);
  const dailyTargets = nutritionPlan?.dailyTargets || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    waterLiters: waterGoal,
  };
  const displayedWaterGoal = dailyTargets.waterLiters > 0 ? dailyTargets.waterLiters : waterGoal;
  const remainingCalories =
    dailyTargets.calories > 0
      ? Math.max(dailyTargets.calories - totals.calories, 0)
      : totals.calories;
  const hasMacroData =
    dailyTargets.protein > 0 ||
    dailyTargets.carbs > 0 ||
    dailyTargets.fat > 0 ||
    totals.protein > 0 ||
    totals.carbs > 0 ||
    totals.fat > 0;
  const budgetProgress =
    dailyTargets.calories > 0
      ? Math.min((totals.calories / dailyTargets.calories) * 100, 100)
      : meals.length > 0
        ? 100
        : 0;
  const waterPct = displayedWaterGoal > 0 ? Math.min(waterIntake / displayedWaterGoal, 1) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>טוען תפריט אישי...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            colors={[COLORS.primary]}
            onRefresh={() => loadNutritionPlan(true)}
            refreshing={refreshing}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Title */}
        <Text style={styles.pageTitle}>תזונה</Text>

        {loadError ? (
          <View style={styles.noticeCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
            <Text style={styles.noticeText}>{loadError}</Text>
          </View>
        ) : null}

        {nutritionPlan ? (
          <View style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={20}
                color={COLORS.primary}
              />
              <View style={styles.planHeaderText}>
                <Text style={styles.planTitle}>{nutritionPlan.title || 'תפריט אישי'}</Text>
                <Text style={styles.planSubtitle}>התפריט שהמאמנת בנתה עבורך</Text>
              </View>
            </View>
            {nutritionPlan.notes ? (
              <Text style={styles.planNotes}>{nutritionPlan.notes}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyPlanCard}>
            <Ionicons name="restaurant-outline" size={28} color={COLORS.textMuted} />
            <Text style={styles.emptyPlanTitle}>עדיין לא הוגדר תפריט אישי</Text>
            <Text style={styles.emptyPlanText}>
              ברגע ששלהבת תשייך לך מתכונים וארוחות, הם יופיעו כאן עם קלוריות ותמונות.
            </Text>
          </View>
        )}

        {nutritionPlan ? (
          <View style={styles.budgetCard}>
            <View style={styles.budgetTop}>
              <Text style={styles.budgetLabel}>
                {dailyTargets.calories > 0 ? 'קלוריות שנותרו' : 'קלוריות בתפריט'}
              </Text>
              <Text style={styles.budgetValue}>{Math.round(remainingCalories)}</Text>
              <Text style={styles.budgetTotal}>
                {dailyTargets.calories > 0
                  ? `מתוך ${Math.round(dailyTargets.calories)}`
                  : meals.length > 0
                    ? 'עדיין לא הוגדר יעד קלורי'
                    : 'ממתין לשיוך מתכונים'}
              </Text>
            </View>
            <View style={styles.budgetProgressBg}>
              <View style={[styles.budgetProgressFill, { width: `${budgetProgress}%` }]} />
            </View>
            {hasMacroData ? (
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#42A5F5' }]} />
                  <Text style={styles.macroLabel}>חלבון</Text>
                  <Text style={styles.macroVal}>
                    {dailyTargets.protein > 0
                      ? `${totals.protein.toFixed(0)}/${dailyTargets.protein}`
                      : `${totals.protein.toFixed(0)} ג׳`}
                  </Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#FFA726' }]} />
                  <Text style={styles.macroLabel}>פחמימות</Text>
                  <Text style={styles.macroVal}>
                    {dailyTargets.carbs > 0
                      ? `${totals.carbs.toFixed(0)}/${dailyTargets.carbs}`
                      : `${totals.carbs.toFixed(0)} ג׳`}
                  </Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#EF5350' }]} />
                  <Text style={styles.macroLabel}>שומן</Text>
                  <Text style={styles.macroVal}>
                    {dailyTargets.fat > 0
                      ? `${totals.fat.toFixed(0)}/${dailyTargets.fat}`
                      : `${totals.fat.toFixed(0)} ג׳`}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Food Diary Button */}
        <TouchableOpacity
          style={styles.diaryBtn}
          onPress={() => navigation.navigate('FoodDiary')}
          activeOpacity={0.85}
        >
          <View style={styles.diaryBtnContent}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
            <View style={styles.diaryBtnTextWrap}>
              <Text style={styles.diaryBtnTitle}>יומן אכילה</Text>
              <Text style={styles.diaryBtnSubtitle}>
                תעדי מה אכלת · בוקר, צהריים, ערב ונשנושים
              </Text>
            </View>
            <View style={styles.diaryBtnIcon}>
              <MaterialCommunityIcons name="notebook-edit-outline" size={24} color="#66BB6A" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Recipe Catalog Button */}
        <TouchableOpacity
          style={styles.recipeBtn}
          onPress={() => navigation.navigate('RecipeCatalog')}
          activeOpacity={0.85}
        >
          <View style={styles.diaryBtnContent}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
            <View style={styles.diaryBtnTextWrap}>
              <Text style={styles.diaryBtnTitle}>ספר מתכונים</Text>
              <Text style={styles.diaryBtnSubtitle}>
                מתכונים בריאים וטעימים · ארוחות בוקר, עיקריות ונשנושים
              </Text>
            </View>
            <View style={styles.recipeBtnIcon}>
              <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#FF8A65" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Water Slider */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Text style={styles.waterValue}>{waterIntake.toFixed(1)} ל׳</Text>
            <View style={styles.waterTitleRow}>
              <Text style={styles.waterLabel}>שתיית מים</Text>
              <Ionicons name="water" size={18} color="#42A5F5" />
            </View>
          </View>
          <View style={styles.waterSliderWrap}>
            <View style={styles.waterSliderBg}>
              <View style={[styles.waterSliderFill, { width: `${waterPct * 100}%` }]} />
            </View>
            <View style={styles.waterBtns}>
              <TouchableOpacity
                onPress={() => setWaterIntake(waterIntake - 0.25)}
                style={styles.waterBtn}
              >
                <Ionicons name="remove-circle-outline" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.waterGoalText}>יעד: {displayedWaterGoal} ליטר</Text>
              <TouchableOpacity
                onPress={() => setWaterIntake(waterIntake + 0.25)}
                style={styles.waterBtn}
              >
                <Ionicons name="add-circle-outline" size={28} color="#42A5F5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Meals */}
        <View style={styles.mealsSection}>
          {meals.length === 0 ? (
            <View style={styles.emptyMealsCard}>
              <Ionicons name="images-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>אין עדיין מתכונים להצגה</Text>
            </View>
          ) : (
            meals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                mealKey={meal.id}
                dailyCalorieTarget={dailyTargets.calories}
                onAddItem={handleAddItem}
              />
            ))
          )}
        </View>

        {/* AI Button */}
        <TouchableOpacity style={styles.aiBtn} onPress={() => setShowAI(true)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="auto-fix" size={22} color={COLORS.white} />
          <Text style={styles.aiBtnText}>פעולות AI ✨</Text>
        </TouchableOpacity>
      </ScrollView>

      <AIModal visible={showAI} onClose={() => setShowAI(false)} onAction={handleAIAction} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 15 },
  // Food Diary Button
  diaryBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#66BB6A44',
    marginBottom: 14,
    overflow: 'hidden',
  },
  diaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  diaryBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#66BB6A18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaryBtnTextWrap: { flex: 1, alignItems: 'flex-end' },
  diaryBtnTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  diaryBtnSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3, textAlign: 'right' },
  recipeBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF8A6544',
    marginBottom: 14,
    overflow: 'hidden',
  },
  recipeBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FF8A6518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  noticeText: { color: COLORS.textSecondary, flex: 1, fontSize: 13, textAlign: 'right' },
  planCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  planHeaderRow: { alignItems: 'center', flexDirection: 'row-reverse', gap: 10 },
  planHeaderText: { alignItems: 'flex-end', flex: 1 },
  planTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', textAlign: 'right' },
  planSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2, textAlign: 'right' },
  planNotes: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    textAlign: 'right',
  },
  emptyPlanCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 14,
    padding: 20,
  },
  emptyPlanTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptyPlanText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  budgetCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  budgetTop: { alignItems: 'center', marginBottom: 12 },
  budgetLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  budgetValue: { color: COLORS.primary, fontSize: 48, fontWeight: 'bold', lineHeight: 54 },
  budgetTotal: { color: COLORS.textMuted, fontSize: 13 },
  budgetProgressBg: {
    height: 8,
    backgroundColor: COLORS.cardLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  budgetProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { color: COLORS.textSecondary, fontSize: 11 },
  macroVal: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  waterCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waterLabel: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  waterValue: { color: '#42A5F5', fontSize: 20, fontWeight: 'bold' },
  waterSliderWrap: {},
  waterSliderBg: {
    height: 10,
    backgroundColor: COLORS.cardLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  waterSliderFill: { height: '100%', backgroundColor: '#42A5F5', borderRadius: 5 },
  waterBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterBtn: { padding: 4 },
  waterGoalText: { color: COLORS.textSecondary, fontSize: 13 },
  mealsSection: { gap: 10, marginBottom: 20 },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  mealHeaderRight: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row-reverse',
    gap: 10,
    justifyContent: 'flex-end',
  },
  mealHeaderTextWrap: { alignItems: 'flex-end', flex: 1 },
  mealName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  mealHeaderMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2, textAlign: 'right' },
  mealHeaderImage: { backgroundColor: COLORS.cardLight, borderRadius: 12, height: 54, width: 54 },
  mealHeaderImageFallback: {
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  mealProgressBg: { height: 4, backgroundColor: COLORS.cardLight, marginHorizontal: 14 },
  mealProgressFill: { height: '100%', backgroundColor: COLORS.primary },
  mealProgressLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
  },
  mealBody: { paddingHorizontal: 14, paddingBottom: 12 },
  mealNote: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
    textAlign: 'right',
  },
  mealItem: {
    alignItems: 'flex-start',
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mealItemImage: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    height: 56,
    marginLeft: 10,
    width: 56,
  },
  mealItemImageFallback: {
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    marginLeft: 10,
    width: 56,
  },
  mealItemRight: { flex: 1, alignItems: 'flex-end' },
  mealItemName: { color: COLORS.white, fontSize: 14, textAlign: 'right' },
  mealItemPortion: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'right', marginTop: 2 },
  mealItemNotes: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: 'right' },
  mealItemMeta: { alignItems: 'flex-end', marginLeft: 10 },
  mealItemCalories: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  mealItemMacros: { flexDirection: 'row', gap: 4 },
  macroBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  macroText: { fontSize: 10, fontWeight: '600' },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addItemText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  emptyMealsCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  aiBtnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  aiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  aiSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  aiTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  aiSubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' },
  aiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.cardLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  aiActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActionText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
});
