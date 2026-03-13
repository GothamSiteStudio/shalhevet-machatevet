import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { COLORS } from '../theme/colors';
import {
  FOOD_DIARY_MEAL_TYPES,
  getFoodDiaryMealLabel,
  normalizeFoodDiaryEntry,
} from '../utils/foodDiary';

function createDraftItem() {
  return {
    id: `coach-food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    portion: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    source: 'coach',
    photoUri: '',
  };
}

function toInputValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function mapEntryToDraft(entry) {
  const normalized = normalizeFoodDiaryEntry(entry, entry?.date);

  return {
    ...normalized,
    meals: FOOD_DIARY_MEAL_TYPES.reduce((accumulator, mealType) => {
      accumulator[mealType] = normalized.meals[mealType].map(item => ({
        ...item,
        calories: toInputValue(item.calories),
        protein: toInputValue(item.protein),
        carbs: toInputValue(item.carbs),
        fat: toInputValue(item.fat),
      }));
      return accumulator;
    }, {}),
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTotals(meals) {
  const items = FOOD_DIARY_MEAL_TYPES.flatMap(mealType => meals[mealType] || []);

  return {
    calories: items.reduce((sum, item) => sum + toNumber(item.calories), 0),
    protein: items.reduce((sum, item) => sum + toNumber(item.protein), 0),
    carbs: items.reduce((sum, item) => sum + toNumber(item.carbs), 0),
    fat: items.reduce((sum, item) => sum + toNumber(item.fat), 0),
  };
}

export default function CoachFoodDiaryEditorModal({ visible, entry, saving, onClose, onSave }) {
  const [draftEntry, setDraftEntry] = useState(() => mapEntryToDraft(entry));

  useEffect(() => {
    if (visible) {
      setDraftEntry(mapEntryToDraft(entry));
    }
  }, [visible, entry]);

  const totals = useMemo(() => calculateTotals(draftEntry.meals), [draftEntry.meals]);

  const addItem = mealType => {
    setDraftEntry(current => ({
      ...current,
      meals: {
        ...current.meals,
        [mealType]: [...current.meals[mealType], createDraftItem()],
      },
    }));
  };

  const removeItem = (mealType, itemId) => {
    setDraftEntry(current => ({
      ...current,
      meals: {
        ...current.meals,
        [mealType]: current.meals[mealType].filter(item => item.id !== itemId),
      },
    }));
  };

  const updateItemField = (mealType, itemId, field, value) => {
    setDraftEntry(current => ({
      ...current,
      meals: {
        ...current.meals,
        [mealType]: current.meals[mealType].map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const handleSave = () => {
    const meals = FOOD_DIARY_MEAL_TYPES.reduce((accumulator, mealType) => {
      accumulator[mealType] = draftEntry.meals[mealType]
        .filter(item => item.name.trim())
        .map(item => ({
          id: item.id,
          name: item.name.trim(),
          portion: item.portion.trim(),
          calories: toNumber(item.calories),
          protein: toNumber(item.protein),
          carbs: toNumber(item.carbs),
          fat: toNumber(item.fat),
          source: item.source || 'coach',
          photoUri: item.photoUri || '',
        }));
      return accumulator;
    }, {});

    onSave(draftEntry.date, meals);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>עריכת יומן אכילה</Text>
              <Text style={styles.subtitle}>{draftEntry.date || 'ללא תאריך'}</Text>
            </View>
            <View style={styles.headerIconBtn} />
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{Math.round(totals.calories)}</Text>
              <Text style={styles.summaryLabel}>קלוריות</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryValue, { color: '#42A5F5' }]}>
                {totals.protein.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>חלבון</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryValue, { color: '#FFA726' }]}>
                {totals.carbs.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>פחמימות</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryValue, { color: '#EF5350' }]}>
                {totals.fat.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>שומן</Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {FOOD_DIARY_MEAL_TYPES.map(mealType => (
              <View key={mealType} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <TouchableOpacity onPress={() => addItem(mealType)} style={styles.addBtn}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.addBtnText}>הוסיפי פריט</Text>
                  </TouchableOpacity>
                  <Text style={styles.mealTitle}>{getFoodDiaryMealLabel(mealType)}</Text>
                </View>

                {draftEntry.meals[mealType].length === 0 ? (
                  <Text style={styles.emptyText}>עדיין אין פריטים בארוחה הזו.</Text>
                ) : (
                  draftEntry.meals[mealType].map((item, index) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <TouchableOpacity
                          onPress={() => removeItem(mealType, item.id)}
                          style={styles.removeBtn}
                        >
                          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                          <Text style={styles.removeBtnText}>מחיקה</Text>
                        </TouchableOpacity>
                        <Text style={styles.itemTitle}>פריט {index + 1}</Text>
                      </View>

                      <TextInput
                        style={styles.input}
                        value={item.name}
                        onChangeText={value => updateItemField(mealType, item.id, 'name', value)}
                        placeholder="שם המאכל"
                        placeholderTextColor={COLORS.textMuted}
                        textAlign="right"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.portion}
                        onChangeText={value => updateItemField(mealType, item.id, 'portion', value)}
                        placeholder="כמות / תיאור מנה"
                        placeholderTextColor={COLORS.textMuted}
                        textAlign="right"
                      />

                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          value={item.calories}
                          onChangeText={value =>
                            updateItemField(mealType, item.id, 'calories', value)
                          }
                          placeholder="קלוריות"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                          textAlign="right"
                        />
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          value={item.protein}
                          onChangeText={value =>
                            updateItemField(mealType, item.id, 'protein', value)
                          }
                          placeholder="חלבון"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                          textAlign="right"
                        />
                      </View>

                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          value={item.carbs}
                          onChangeText={value => updateItemField(mealType, item.id, 'carbs', value)}
                          placeholder="פחמימות"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                          textAlign="right"
                        />
                        <TextInput
                          style={[styles.input, styles.halfInput]}
                          value={item.fat}
                          onChangeText={value => updateItemField(mealType, item.id, 'fat', value)}
                          placeholder="שומן"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                          textAlign="right"
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>שמרי יומן</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    gap: 12,
    paddingBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  halfInput: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 4,
    marginBottom: 16,
    width: 42,
  },
  headerIconBtn: {
    alignItems: 'center',
    width: 28,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTextWrap: {
    alignItems: 'center',
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  mealHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealSection: {
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  mealTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  removeBtn: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 4,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 1.4,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '92%',
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryChip: {
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
