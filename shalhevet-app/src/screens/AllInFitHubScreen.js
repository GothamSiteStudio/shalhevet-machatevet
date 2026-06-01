/**
 * AllInFitHubScreen.js — לוח הקטגוריה "All-in-Fit"
 * רשת הפיצ׳רים המתקדמים, בעיצוב שלהבת. מוצג גם למאמנת וגם למתאמנת.
 * הפיצ׳רים המקוריים של שלהבת נשארים בלשונית/טאב הראשי.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

const FEATURES = [
  {
    key: 'exercises',
    route: 'ExerciseLibrary',
    icon: 'barbell-outline',
    title: 'ספריית תרגילים',
    sub: 'מאגר תרגילים עם הסברים, שרירים וציוד',
    live: true,
  },
  { key: 'workouts', route: 'WorkoutTracker', icon: 'fitness-outline', title: 'מעקב אימונים', sub: 'סטים, חזרות, שיאים ורצף שבועי', live: true },
  { key: 'measurements', icon: 'body-outline', title: 'מדידות גוף', sub: 'היקפים, אחוז שומן ומעקב לאורך זמן', live: false },
  { key: 'photos', icon: 'camera-outline', title: 'תמונות התקדמות', sub: 'לפני / אחרי והשוואות', live: false },
  { key: 'barcode', icon: 'barcode-outline', title: 'סריקת ברקוד', sub: 'זיהוי מזון מהיר ויומן תזונה', live: false },
  { key: 'ai', icon: 'sparkles-outline', title: 'עוזר AI', sub: 'המלצות תזונה ואימון חכמות', live: false },
];

function FeatureCard({ item, onPress }) {
  const disabled = !item.live;
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${item.title}. ${item.sub}${disabled ? '. בקרוב' : ''}`}
      accessibilityHint={disabled ? 'פיצ׳ר זה ייפתח בקרוב' : 'לחצי לפתיחה'}
    >
      <View style={[styles.iconWrap, disabled && styles.iconWrapDisabled]}>
        <Ionicons name={item.icon} size={26} color={disabled ? COLORS.textMuted : COLORS.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {disabled ? (
            <View style={styles.soonBadge}>
              <Text style={styles.soonText}>בקרוב</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardSub}>{item.sub}</Text>
      </View>
      {!disabled ? <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} /> : null}
    </TouchableOpacity>
  );
}

export default function AllInFitHubScreen({ navigation }) {
  const role = useStore(s => s.user?.role);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          All-in-Fit
        </Text>
        <Text style={styles.headerSub}>
          פיצ׳רים מתקדמים{role === 'coach' ? ' · ניהול' : ''}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.notice} accessible accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
          <Text style={styles.noticeText}>
            הפיצ׳רים המקוריים של שלהבת נמצאים בלשונית הראשית. כאן מתווספים בהדרגה הכלים המתקדמים.
          </Text>
        </View>
        {FEATURES.map(item => (
          <FeatureCard key={item.key} item={item} onPress={() => navigation.navigate(item.route)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 14,
    marginBottom: 12,
    minHeight: 76,
    padding: 16,
  },
  cardBody: { flex: 1 },
  cardDisabled: { opacity: 0.6 },
  cardSub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, textAlign: 'right' },
  cardTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  container: { paddingBottom: 32, paddingHorizontal: 16 },
  header: { paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8 },
  headerSub: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 2, textAlign: 'right' },
  headerTitle: { color: COLORS.white, fontSize: 26, fontWeight: 'bold', textAlign: 'right' },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#E5393522',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  iconWrapDisabled: { backgroundColor: COLORS.cardLight },
  notice: {
    alignItems: 'center',
    backgroundColor: '#1565C022',
    borderColor: '#1565C055',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  noticeText: { color: COLORS.textSecondary, flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  safe: { backgroundColor: COLORS.background, flex: 1 },
  soonBadge: { backgroundColor: COLORS.cardLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  soonText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  titleRow: { alignItems: 'center', flexDirection: 'row-reverse', gap: 8 },
});
