import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function getWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

export default function WorkoutScreen() {
  const {
    workoutWeeks,
    toggleWorkoutDay,
    aerobicMinutes,
    setAerobicMinutes,
    dailySteps,
    dailyDistance,
    dailyFloors,
    dailyCalories,
  } = useStore();

  const weekKey = getWeekKey();
  const days = workoutWeeks[weekKey] || [false, false, false, false, false, false, false];
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    Alert.alert('✅ עודכן!', 'הסטטוס השבועי עודכן בהצלחה', [
      { text: 'סגור', onPress: () => setSaved(false) },
    ]);
  };

  const workoutCount = days.filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header Image */}
        <View style={styles.headerImageWrap}>
          <LinearGradient
            colors={['#1A0000', '#111111']}
            style={styles.headerImage}
          >
            <MaterialCommunityIcons name="dumbbell" size={48} color={COLORS.primary} />
            <Text style={styles.headerTitle}>אימונים</Text>
          </LinearGradient>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
          <Text style={styles.saveTopBtnText}>שמור סטטוס</Text>
        </TouchableOpacity>

        {/* Weekly Workout Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס אימונים שבועי:</Text>
          <View style={styles.card}>
            <View style={styles.daysRow}>
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayBox, days[index] && styles.dayBoxActive]}
                  onPress={() => toggleWorkoutDay(weekKey, index)}
                  activeOpacity={0.7}
                >
                  {days[index] ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  ) : null}
                  <Text style={[styles.dayLabel, days[index] && styles.dayLabelActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.workoutCount}>
              {workoutCount} מתוך 7 ימים הושלמו
            </Text>
            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${(workoutCount / 7) * 100}%` }]} />
            </View>
          </View>
        </View>

        {/* Weekly Aerobic Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס אירובי שבועי:</Text>
          <View style={styles.card}>
            <View style={styles.aerobicRow}>
              <TouchableOpacity
                style={styles.aerobicBtn}
                onPress={() => setAerobicMinutes(aerobicMinutes - 5)}
              >
                <Ionicons name="remove-circle-outline" size={38} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <View style={styles.aerobicCenter}>
                <MaterialCommunityIcons name="heart-pulse" size={40} color={COLORS.primary} />
                <Text style={styles.aerobicMinutes}>{aerobicMinutes}</Text>
                <Text style={styles.aerobicLabel}>דקות</Text>
              </View>

              <TouchableOpacity
                style={styles.aerobicBtn}
                onPress={() => setAerobicMinutes(aerobicMinutes + 5)}
              >
                <Ionicons name="add-circle-outline" size={38} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.aerobicQuickRow}>
              {[10, 20, 30, 45, 60].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.quickBtn,
                    aerobicMinutes === min && styles.quickBtnActive,
                  ]}
                  onPress={() => setAerobicMinutes(min)}
                >
                  <Text style={[styles.quickBtnText, aerobicMinutes === min && styles.quickBtnTextActive]}>
                    {min}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Daily Data Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס נתונים יומי:</Text>
          <View style={styles.card}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="walk" size={24} color={COLORS.primary} />
                <Text style={styles.statValue}>{dailySteps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>צעדים</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.info} />
                <Text style={styles.statValue}>{dailyDistance} מ׳</Text>
                <Text style={styles.statLabel}>מרחק</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="stairs" size={24} color={COLORS.warning} />
                <Text style={styles.statValue}>{dailyFloors}</Text>
                <Text style={styles.statLabel}>קומות</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color={COLORS.accent} />
                <Text style={styles.statValue}>{dailyCalories}</Text>
                <Text style={styles.statLabel}>קלוריות</Text>
              </View>
            </View>

            {/* Steps progress */}
            <View style={styles.stepsGoalRow}>
              <Text style={styles.stepsGoalText}>יעד: 10,000 צעדים</Text>
              <Text style={styles.stepsGoalPct}>{Math.round((dailySteps / 10000) * 100)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  styles.progressBlue,
                  { width: `${Math.min((dailySteps / 10000) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Big Save Button */}
        <TouchableOpacity style={styles.bigSaveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
          <Text style={styles.bigSaveBtnText}>שמור את כל הנתונים</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingBottom: 40,
  },
  headerImageWrap: {
    height: 160,
    overflow: 'hidden',
  },
  headerImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  saveTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveTopBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayBox: {
    width: 38,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
    gap: 2,
  },
  dayBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  dayLabelActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  workoutCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.cardLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressBlue: {
    backgroundColor: COLORS.info,
  },
  aerobicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aerobicBtn: {
    padding: 8,
  },
  aerobicCenter: {
    alignItems: 'center',
    gap: 4,
  },
  aerobicMinutes: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  aerobicLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  aerobicQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },
  quickBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  quickBtnTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
    gap: 4,
  },
  statValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  stepsGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepsGoalText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  stepsGoalPct: {
    color: COLORS.info,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  bigSaveBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
});
