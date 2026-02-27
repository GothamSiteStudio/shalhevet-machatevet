import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatDate(date) {
  return `${date.getDate()} ${MONTHS_HE[date.getMonth()]}`;
}

function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

function MealCard({ meal, mealKey, onAddItem }) {
  const [expanded, setExpanded] = useState(false);
  const usedProtein = meal.items.reduce((s, i) => s + (i.protein || 0), 0);
  const usedCarbs = meal.items.reduce((s, i) => s + (i.carbs || 0), 0);
  const usedFat = meal.items.reduce((s, i) => s + (i.fat || 0), 0);
  const usedTotal = usedProtein + usedCarbs + usedFat;
  const pct = Math.min((usedTotal / meal.maxPoints) * 100, 100);

  return (
    <View style={styles.mealCard}>
      <TouchableOpacity style={styles.mealHeader} onPress={() => setExpanded(!expanded)}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18} color={COLORS.textSecondary}
        />
        <View style={styles.mealHeaderRight}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealPoints}>{meal.maxPoints} נק׳</Text>
          <MaterialCommunityIcons name="star-four-points" size={14} color={COLORS.primary} />
        </View>
      </TouchableOpacity>

      <View style={styles.mealProgressBg}>
        <View style={[styles.mealProgressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.mealProgressLabel}>
        {usedTotal.toFixed(1)} / {meal.maxPoints} נק׳ בשימוש
      </Text>

      {expanded && (
        <View style={styles.mealBody}>
          {meal.items.map((item, idx) => (
            <View key={idx} style={styles.mealItem}>
              <View style={styles.mealItemRight}>
                <Text style={styles.mealItemName}>{item.name}</Text>
                <Text style={styles.mealItemPortion}>{item.portion}</Text>
              </View>
              <View style={styles.mealItemMacros}>
                <View style={[styles.macroBadge, { backgroundColor: '#1565C044' }]}>
                  <Text style={[styles.macroText, { color: '#42A5F5' }]}>
                    נ {item.protein.toFixed(1)}
                  </Text>
                </View>
                <View style={[styles.macroBadge, { backgroundColor: '#E65100' + '44' }]}>
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
          {actions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.aiAction, { borderColor: a.color + '44' }]}
              onPress={() => { onAction(a.id); onClose(); }}
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

export default function NutritionScreen() {
  const { nutritionBudget, waterIntake, waterGoal, setWaterIntake, getMealsByDate } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAI, setShowAI] = useState(false);
  const [draggingWater, setDraggingWater] = useState(false);

  const dateKey = getDateKey(selectedDate);
  const meals = getMealsByDate(dateKey);

  const allItems = Object.values(meals).flatMap((m) => m.items);
  const usedProtein = allItems.reduce((s, i) => s + (i.protein || 0), 0);
  const usedCarbs = allItems.reduce((s, i) => s + (i.carbs || 0), 0);
  const usedFat = allItems.reduce((s, i) => s + (i.fat || 0), 0);
  const usedTotal = usedProtein + usedCarbs + usedFat;
  const remaining = Math.max(nutritionBudget.total - usedTotal, 0);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleAIAction = (id) => {
    const msgs = {
      photo: 'פיצ׳ר זיהוי תמונה יהיה זמין בקרוב! 📸',
      ask: 'הצ׳אט עם AI יהיה זמין בקרוב! 🤖',
      recipe: 'בניית מתכונים ב-AI יהיה זמין בקרוב! 🍳',
      alt: 'הצעות חלופיות ב-AI יהיו זמינות בקרוב! 🔄',
    };
    Alert.alert('✨ בקרוב!', msgs[id] || 'פיצ׳ר זה יהיה זמין בקרוב');
  };

  const handleAddItem = (mealKey) => {
    Alert.alert('הוסף פריט', 'פיצ׳ר הוספת פריטים ידנית יהיה זמין בקרוב');
  };

  const waterPct = waterGoal > 0 ? waterIntake / waterGoal : 0;
  const SLIDER_W = width - 80;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Title */}
        <Text style={styles.pageTitle}>תזונה</Text>

        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={nextDay} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Text style={styles.dateDayName}>{DAYS_HE[selectedDate.getDay()]}</Text>
          </View>
          <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Points Budget */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <Text style={styles.budgetLabel}>נקודות שנותרו</Text>
            <Text style={styles.budgetValue}>{remaining.toFixed(1)}</Text>
            <Text style={styles.budgetTotal}>מתוך {nutritionBudget.total}</Text>
          </View>
          <View style={styles.budgetProgressBg}>
            <View style={[styles.budgetProgressFill, { width: `${(usedTotal / nutritionBudget.total) * 100}%` }]} />
          </View>
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#42A5F5' }]} />
              <Text style={styles.macroLabel}>חלבון</Text>
              <Text style={styles.macroVal}>{usedProtein.toFixed(1)}/{nutritionBudget.protein}</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#FFA726' }]} />
              <Text style={styles.macroLabel}>פחמימות</Text>
              <Text style={styles.macroVal}>{usedCarbs.toFixed(1)}/{nutritionBudget.carbs}</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#EF5350' }]} />
              <Text style={styles.macroLabel}>שומן</Text>
              <Text style={styles.macroVal}>{usedFat.toFixed(1)}/{nutritionBudget.fat}</Text>
            </View>
          </View>
        </View>

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
              <TouchableOpacity onPress={() => setWaterIntake(waterIntake - 0.25)} style={styles.waterBtn}>
                <Ionicons name="remove-circle-outline" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.waterGoalText}>יעד: {waterGoal} ליטר</Text>
              <TouchableOpacity onPress={() => setWaterIntake(waterIntake + 0.25)} style={styles.waterBtn}>
                <Ionicons name="add-circle-outline" size={28} color="#42A5F5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Meals */}
        <View style={styles.mealsSection}>
          {Object.entries(meals).map(([key, meal]) => (
            <MealCard key={key} meal={meal} mealKey={key} onAddItem={handleAddItem} />
          ))}
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
  pageTitle: {
    color: COLORS.white, fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', marginTop: 16, marginBottom: 16,
  },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateArrow: { padding: 4 },
  dateCenter: { alignItems: 'center' },
  dateText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  dateDayName: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  budgetCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  budgetTop: { alignItems: 'center', marginBottom: 12 },
  budgetLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  budgetValue: { color: COLORS.primary, fontSize: 48, fontWeight: 'bold', lineHeight: 54 },
  budgetTotal: { color: COLORS.textMuted, fontSize: 13 },
  budgetProgressBg: {
    height: 8, backgroundColor: COLORS.cardLight, borderRadius: 4,
    overflow: 'hidden', marginBottom: 14,
  },
  budgetProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { color: COLORS.textSecondary, fontSize: 11 },
  macroVal: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  waterCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waterLabel: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  waterValue: { color: '#42A5F5', fontSize: 20, fontWeight: 'bold' },
  waterSliderWrap: {},
  waterSliderBg: {
    height: 10, backgroundColor: COLORS.cardLight, borderRadius: 5,
    overflow: 'hidden', marginBottom: 12,
  },
  waterSliderFill: { height: '100%', backgroundColor: '#42A5F5', borderRadius: 5 },
  waterBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterBtn: { padding: 4 },
  waterGoalText: { color: COLORS.textSecondary, fontSize: 13 },
  mealsSection: { gap: 10, marginBottom: 20 },
  mealCard: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  mealName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  mealPoints: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold' },
  mealProgressBg: { height: 4, backgroundColor: COLORS.cardLight, marginHorizontal: 14 },
  mealProgressFill: { height: '100%', backgroundColor: COLORS.primary },
  mealProgressLabel: {
    color: COLORS.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 6,
  },
  mealBody: { paddingHorizontal: 14, paddingBottom: 12 },
  mealItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  mealItemRight: { flex: 1, alignItems: 'flex-end' },
  mealItemName: { color: COLORS.white, fontSize: 14, textAlign: 'right' },
  mealItemPortion: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'right', marginTop: 2 },
  mealItemMacros: { flexDirection: 'row', gap: 4, marginRight: 8 },
  macroBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  macroText: { fontSize: 10, fontWeight: '600' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  addItemText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  aiBtnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  aiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  aiSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  aiTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  aiSubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  aiAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.cardLight, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1,
  },
  aiActionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiActionText: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '500', textAlign: 'right' },
});
