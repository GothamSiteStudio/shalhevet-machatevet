import React, { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { usersAPI } from '../services/api';
import {
  FOOD_DATABASE,
  searchFoods,
  calculateNutrition,
  formatFoodPortion,
  getFoodMeasurementConfig,
  getFoodReferenceText,
} from '../data/foodDatabase';
import { getFoodDiaryDateKey, normalizeFoodDiaryEntry } from '../utils/foodDiary';

const MEAL_CONFIG = {
  breakfast: { label: 'ארוחת בוקר', icon: 'sunny-outline', color: '#FFA726' },
  lunch: { label: 'ארוחת צהריים', icon: 'restaurant-outline', color: '#66BB6A' },
  dinner: { label: 'ארוחת ערב', icon: 'moon-outline', color: '#7E57C2' },
  snacks: { label: 'נשנושים', icon: 'cafe-outline', color: '#42A5F5' },
};

function getHebrewDate(date) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ];
  return `יום ${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function createDiaryItemId() {
  return `fd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Add Food Modal ─────────────────────────────────────
function AddFoodModal({ visible, onClose, onAdd, mealType }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [mode, setMode] = useState('search'); // 'search' | 'custom'

  const results = useMemo(() => {
    if (mode === 'custom') return [];
    if (!searchQuery) return FOOD_DATABASE.slice(0, 20);
    return searchFoods(searchQuery);
  }, [searchQuery, mode]);

  const measurementConfig = useMemo(
    () => (selectedFood ? getFoodMeasurementConfig(selectedFood) : null),
    [selectedFood]
  );

  const calculated = useMemo(() => {
    if (!selectedFood) return null;
    return calculateNutrition(
      selectedFood,
      Number(quantity) || measurementConfig?.defaultAmount || 1
    );
  }, [measurementConfig, quantity, selectedFood]);

  const resetAndClose = useCallback(() => {
    setSearchQuery('');
    setSelectedFood(null);
    setQuantity('100');
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setMode('search');
    onClose();
  }, [onClose]);

  const handleAddFromDB = () => {
    if (!selectedFood || !calculated || !measurementConfig) return;

    const safeQuantity = Number(quantity) || measurementConfig.defaultAmount || 1;

    onAdd({
      name: selectedFood.name,
      portion: formatFoodPortion(selectedFood, safeQuantity),
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      source: 'database',
    });
    resetAndClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם מאכל');
      return;
    }
    onAdd({
      name: customName.trim(),
      portion: '',
      calories: Number(customCalories) || 0,
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
      source: 'manual',
    });
    resetAndClose();
  };

  const config = MEAL_CONFIG[mealType] || MEAL_CONFIG.snacks;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetAndClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>הוסף ל{config.label}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'search' && styles.modeBtnActive]}
              onPress={() => {
                setMode('search');
                setSelectedFood(null);
              }}
            >
              <Text style={[styles.modeBtnText, mode === 'search' && styles.modeBtnTextActive]}>
                חיפוש מאגר
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'custom' && styles.modeBtnActive]}
              onPress={() => {
                setMode('custom');
                setSelectedFood(null);
              }}
            >
              <Text style={[styles.modeBtnText, mode === 'custom' && styles.modeBtnTextActive]}>
                הזנה ידנית
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'search' ? (
            <>
              {/* Search Input */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפש מאכל..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>

              {selectedFood ? (
                /* Selected Food Details */
                <View style={styles.selectedCard}>
                  <TouchableOpacity
                    style={styles.selectedBack}
                    onPress={() => setSelectedFood(null)}
                  >
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.selectedBackText}>חזרה לרשימה</Text>
                  </TouchableOpacity>
                  <Text style={styles.selectedName}>{selectedFood.name}</Text>
                  <Text style={styles.selectedUnit}>
                    חישוב לפי: {getFoodReferenceText(selectedFood)}
                  </Text>

                  <View style={styles.gramsRow}>
                    <Text style={styles.gramsLabel}>
                      {measurementConfig?.inputLabel || 'כמות'}:
                    </Text>
                    <TextInput
                      style={styles.gramsInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>

                  {calculated && (
                    <View style={styles.nutritionPreview}>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{calculated.calories}</Text>
                        <Text style={styles.nutritionLabel}>קלוריות</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: '#42A5F5' }]}>
                          {calculated.protein}
                        </Text>
                        <Text style={styles.nutritionLabel}>חלבון</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: '#FFA726' }]}>
                          {calculated.carbs}
                        </Text>
                        <Text style={styles.nutritionLabel}>פחמימות</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: '#EF5350' }]}>
                          {calculated.fat}
                        </Text>
                        <Text style={styles.nutritionLabel}>שומן</Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.addBtn} onPress={handleAddFromDB}>
                    <Ionicons name="add-circle" size={20} color={COLORS.white} />
                    <Text style={styles.addBtnText}>הוסף</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Food List */
                <FlatList
                  data={results}
                  keyExtractor={item => item.id}
                  style={styles.foodList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={styles.emptyListText}>
                      {searchQuery ? 'לא נמצאו תוצאות' : 'הקלד לחיפוש'}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.foodItem}
                      onPress={() => {
                        setSelectedFood(item);
                        setQuantity(String(getFoodMeasurementConfig(item).defaultAmount));
                      }}
                    >
                      <View style={styles.foodItemRight}>
                        <Text style={styles.foodItemName}>{item.name}</Text>
                        <Text style={styles.foodItemMeta}>{getFoodReferenceText(item)}</Text>
                      </View>
                      <View style={styles.foodItemMacros}>
                        <Text style={[styles.foodItemMacro, { color: '#42A5F5' }]}>
                          נ {item.protein}
                        </Text>
                        <Text style={[styles.foodItemMacro, { color: '#FFA726' }]}>
                          פ {item.carbs}
                        </Text>
                        <Text style={[styles.foodItemMacro, { color: '#EF5350' }]}>
                          ש {item.fat}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          ) : (
            /* Custom Entry Mode */
            <ScrollView
              style={styles.customForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.customInput}
                placeholder="שם המאכל *"
                placeholderTextColor={COLORS.textMuted}
                value={customName}
                onChangeText={setCustomName}
                textAlign="right"
              />
              <TextInput
                style={styles.customInput}
                placeholder="קלוריות"
                placeholderTextColor={COLORS.textMuted}
                value={customCalories}
                onChangeText={setCustomCalories}
                keyboardType="numeric"
                textAlign="right"
              />
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.customInput, styles.customInputThird]}
                  placeholder="שומן (ג׳)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customFat}
                  onChangeText={setCustomFat}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <TextInput
                  style={[styles.customInput, styles.customInputThird]}
                  placeholder="פחמימות (ג׳)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <TextInput
                  style={[styles.customInput, styles.customInputThird]}
                  placeholder="חלבון (ג׳)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddCustom}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>הוסף</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Meal Section Tile ──────────────────────────────────
function MealTile({ mealType, items, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const config = MEAL_CONFIG[mealType];
  const totals = useMemo(
    () => ({
      calories: items.reduce((s, i) => s + (i.calories || 0), 0),
      protein: items.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: items.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: items.reduce((s, i) => s + (i.fat || 0), 0),
    }),
    [items]
  );

  return (
    <View style={[styles.mealTile, { borderColor: config.color + '44' }]}>
      <TouchableOpacity
        style={styles.mealTileHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textSecondary}
        />
        <View style={styles.mealTileHeaderCenter}>
          {items.length > 0 && (
            <Text style={styles.mealTileCalories}>{Math.round(totals.calories)} קל׳</Text>
          )}
        </View>
        <View style={styles.mealTileHeaderRight}>
          <Text style={styles.mealTileName}>{config.label}</Text>
          <View style={[styles.mealTileIcon, { backgroundColor: config.color + '22' }]}>
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Macros summary */}
      {items.length > 0 && (
        <View style={styles.mealTileMacros}>
          <View style={[styles.tinyMacro, { backgroundColor: '#42A5F522' }]}>
            <Text style={[styles.tinyMacroText, { color: '#42A5F5' }]}>
              נ {totals.protein.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.tinyMacro, { backgroundColor: '#FFA72622' }]}>
            <Text style={[styles.tinyMacroText, { color: '#FFA726' }]}>
              פ {totals.carbs.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.tinyMacro, { backgroundColor: '#EF535022' }]}>
            <Text style={[styles.tinyMacroText, { color: '#EF5350' }]}>
              ש {totals.fat.toFixed(1)}
            </Text>
          </View>
        </View>
      )}

      {expanded && (
        <View style={styles.mealTileBody}>
          {items.length === 0 ? (
            <Text style={styles.emptyMealText}>עדיין לא הוספת פריטים</Text>
          ) : (
            items.map(item => (
              <View key={item.id} style={styles.diaryItem}>
                <TouchableOpacity
                  onPress={() => onRemove(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                </TouchableOpacity>
                <View style={styles.diaryItemCenter}>
                  <Text style={styles.diaryItemCalories}>{Math.round(item.calories)} קל׳</Text>
                </View>
                <View style={styles.diaryItemRight}>
                  <Text style={styles.diaryItemName}>{item.name}</Text>
                  {item.portion ? (
                    <Text style={styles.diaryItemPortion}>{item.portion}</Text>
                  ) : null}
                  {item.photoUri ? (
                    <Image source={{ uri: item.photoUri }} style={styles.diaryItemPhoto} />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Add Button */}
      <TouchableOpacity style={styles.mealTileAddBtn} onPress={onAdd} activeOpacity={0.7}>
        <Text style={[styles.mealTileAddText, { color: config.color }]}>+ הוסף מאכל</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────
export default function FoodDiaryScreen({ navigation }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState('breakfast');
  const [diaryEntry, setDiaryEntry] = useState(() => normalizeFoodDiaryEntry(null));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const dateKey = getFoodDiaryDateKey(currentDate);
  const diary = diaryEntry.meals;
  const dayTotals = diaryEntry.totals;

  const loadDiary = useCallback(async () => {
    setLoading(true);

    try {
      const result = await usersAPI.getFoodDiary(dateKey);
      setDiaryEntry(normalizeFoodDiaryEntry(result.entry, dateKey));
      setLoadError('');
    } catch (err) {
      setDiaryEntry(normalizeFoodDiaryEntry(null, dateKey));
      setLoadError(err.message || 'לא ניתן לטעון את יומן האכילה כרגע');
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      loadDiary();
    }, [loadDiary])
  );

  const saveDiary = useCallback(
    async nextMeals => {
      setDiaryEntry(normalizeFoodDiaryEntry({ date: dateKey, meals: nextMeals }, dateKey));
      setSyncing(true);

      try {
        const result = await usersAPI.saveFoodDiary(dateKey, { meals: nextMeals });
        setDiaryEntry(normalizeFoodDiaryEntry(result.entry, dateKey));
        setLoadError('');
      } catch (err) {
        setLoadError(err.message || 'לא ניתן לסנכרן את יומן האכילה');
        Alert.alert('שגיאה', err.message || 'לא ניתן לשמור את יומן האכילה כרגע');
        await loadDiary();
      } finally {
        setSyncing(false);
      }
    },
    [dateKey, loadDiary]
  );

  const goDate = useCallback(
    delta => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + delta);
      setCurrentDate(d);
    },
    [currentDate]
  );

  const handleOpenAdd = mealType => {
    setActiveMealType(mealType);
    setAddModalVisible(true);
  };

  const handleAddItem = item => {
    const nextMeals = {
      ...diary,
      [activeMealType]: [...diary[activeMealType], { ...item, id: item.id || createDiaryItemId() }],
    };

    saveDiary(nextMeals);
  };

  const handleRemoveItem = (mealType, itemId) => {
    const nextMeals = {
      ...diary,
      [mealType]: diary[mealType].filter(item => item.id !== itemId),
    };

    saveDiary(nextMeals);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאפשר גישה למצלמה כדי לצלם אוכל');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setActiveMealType('snacks');
      const nextMeals = {
        ...diary,
        snacks: [
          ...diary.snacks,
          {
            id: createDiaryItemId(),
            name: 'צילום אוכל 📸',
            portion: '',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            photoUri: uri,
            source: 'photo',
          },
        ],
      };

      saveDiary(nextMeals);
      Alert.alert(
        '📸 צילום נוסף!',
        'הצילום נוסף לנשנושים. בקרוב נשלב AI שמזהה אוכל ומחשב קלוריות אוטומטית!'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>טוען יומן אכילה...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>יומן אכילה</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Date Navigator */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => goDate(1)} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>{getHebrewDate(currentDate)}</Text>
            {getFoodDiaryDateKey() === dateKey && <Text style={styles.dateTodayBadge}>היום</Text>}
          </View>
          <TouchableOpacity onPress={() => goDate(-1)} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loadError ? (
          <View style={styles.syncNoticeCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
            <Text style={styles.syncNoticeText}>{loadError}</Text>
          </View>
        ) : null}

        {/* Day Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>סיכום יומי</Text>
          <Text style={styles.summarySubtitle}>
            {syncing ? 'מסנכרן עכשיו למאמנת...' : 'היומן נשמר אוטומטית ומופיע גם למאמנת.'}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(dayTotals.calories)}</Text>
              <Text style={styles.summaryLabel}>קלוריות</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#42A5F5' }]}>
                {dayTotals.protein.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>חלבון (ג׳)</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FFA726' }]}>
                {dayTotals.carbs.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>פחמימות (ג׳)</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#EF5350' }]}>
                {dayTotals.fat.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>שומן (ג׳)</Text>
            </View>
          </View>
        </View>

        {/* Camera Button */}
        <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
          <Ionicons name="camera" size={22} color={COLORS.white} />
          <Text style={styles.cameraBtnText}>צלם אוכל 📸</Text>
        </TouchableOpacity>

        {/* Meal Tiles */}
        {['breakfast', 'lunch', 'dinner'].map(mealType => (
          <MealTile
            key={mealType}
            mealType={mealType}
            items={diary[mealType]}
            onAdd={() => handleOpenAdd(mealType)}
            onRemove={itemId => handleRemoveItem(mealType, itemId)}
          />
        ))}

        {/* Snacks - Standalone Tile */}
        <View style={styles.snacksDivider}>
          <View style={styles.snacksDividerLine} />
          <Text style={styles.snacksDividerText}>נשנושים במהלך היום</Text>
          <View style={styles.snacksDividerLine} />
        </View>
        <MealTile
          mealType="snacks"
          items={diary.snacks}
          onAdd={() => handleOpenAdd('snacks')}
          onRemove={itemId => handleRemoveItem('snacks', itemId)}
        />
      </ScrollView>

      <AddFoodModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleAddItem}
        mealType={activeMealType}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 15 },
  syncNoticeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  syncNoticeText: { color: COLORS.textSecondary, flex: 1, fontSize: 13, textAlign: 'right' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 6 },
  pageTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  summarySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Date Navigator
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dateArrow: { padding: 4 },
  dateCenter: { alignItems: 'center' },
  dateText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  dateTodayBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  summaryDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  // Camera Button
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#42A5F544',
    paddingVertical: 14,
    marginBottom: 14,
  },
  cameraBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  // Meal Tile
  mealTile: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mealTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mealTileHeaderRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  mealTileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTileName: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  mealTileHeaderCenter: { flex: 1, alignItems: 'center' },
  mealTileCalories: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  mealTileMacros: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  tinyMacro: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tinyMacroText: { fontSize: 11, fontWeight: '600' },
  mealTileBody: { paddingHorizontal: 14, paddingBottom: 6 },
  emptyMealText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  mealTileAddBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mealTileAddText: { fontSize: 14, fontWeight: '600' },

  // Diary Item
  diaryItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  diaryItemRight: { flex: 1, alignItems: 'flex-end' },
  diaryItemName: { color: COLORS.white, fontSize: 14, textAlign: 'right' },
  diaryItemPortion: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'right' },
  diaryItemCenter: { alignItems: 'center' },
  diaryItemCalories: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  diaryItemPhoto: {
    width: 50,
    height: 38,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: COLORS.cardLight,
  },

  // Snacks Divider
  snacksDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  snacksDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  snacksDividerText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },

  // ─── Modal Styles ───────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  modeBtnTextActive: { color: COLORS.white },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    paddingVertical: 12,
    textAlign: 'right',
  },

  // Food List
  foodList: { maxHeight: 350 },
  foodItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodItemRight: { flex: 1, alignItems: 'flex-end' },
  foodItemName: { color: COLORS.white, fontSize: 15, textAlign: 'right' },
  foodItemMeta: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 2 },
  foodItemMacros: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  foodItemMacro: { fontSize: 11, fontWeight: '600' },
  emptyListText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 30 },

  // Selected Food
  selectedCard: { paddingVertical: 8 },
  selectedBack: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  selectedBackText: { color: COLORS.textSecondary, fontSize: 13 },
  selectedName: { color: COLORS.white, fontSize: 20, fontWeight: '700', textAlign: 'right' },
  selectedUnit: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginTop: 4 },
  gramsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  gramsLabel: { color: COLORS.textSecondary, fontSize: 14 },
  gramsInput: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 90,
    textAlign: 'center',
  },
  nutritionPreview: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 },
  nutritionItem: { alignItems: 'center' },
  nutritionValue: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  nutritionLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },

  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  addBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  // Custom Form
  customForm: { maxHeight: 380 },
  customInput: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.white,
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    textAlign: 'right',
  },
  customRow: { flexDirection: 'row', gap: 8 },
  customInputThird: { flex: 1 },
});
