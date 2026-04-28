import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { usersAPI } from '../services/api';
import useStore from '../store/useStore';
import { getFoodDiaryDateKey, normalizeFoodDiaryEntry } from '../utils/foodDiary';
import { hasPinnedMenuContent, normalizePinnedMenu } from '../utils/pinnedMenu';
import PinnedMenuCard from '../components/PinnedMenuCard';
import { Button, Skeleton, FadeInView } from '../components/ui';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48 - 16) / 2;
const LAST_SEEN_PINNED_MENU_KEY = 'last_seen_pinned_menu_updated_at';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const MENU_ITEMS = [
  {
    id: 'weight',
    label: 'עדכון משקל',
    accessibilityHint: 'פתחי חלון לעדכון המשקל הנוכחי שלך',
    icon: 'scale-bathroom',
    library: 'material',
    tab: null,
    screen: 'WeightModal',
    color: '#D32F2F',
  },
  {
    id: 'water',
    label: 'מים',
    accessibilityHint: 'מעבר לדף תזונה ומעקב שתייה',
    icon: 'water',
    library: 'ionicons',
    tab: 'Nutrition',
    color: '#1565C0',
  },
  {
    id: 'nutrition',
    label: 'תזונה',
    accessibilityHint: 'מעבר לדף מעקב תזונה',
    icon: 'nutrition',
    library: 'material',
    tab: 'Nutrition',
    color: '#2E7D32',
  },
  {
    id: 'progress',
    label: 'התקדמות',
    accessibilityHint: 'מעבר לדף מעקב התקדמות',
    icon: 'bar-chart',
    library: 'ionicons',
    tab: null,
    screen: 'Progress',
    color: '#6A1B9A',
  },
  {
    id: 'points',
    label: 'הנקודות שלי',
    accessibilityHint: 'מעבר לדף הנקודות שנצברו',
    icon: 'trophy',
    library: 'ionicons',
    tab: 'Coach',
    color: '#E65100',
  },
  {
    id: 'diary',
    label: 'יומן',
    accessibilityHint: 'מעבר ליומן האימונים',
    icon: 'calendar',
    library: 'ionicons',
    tab: 'Workout',
    color: '#00695C',
  },
];

function MenuCard({ item, onPress, index }) {
  const IconComponent =
    item.library === 'material'
      ? MaterialCommunityIcons
      : item.library === 'fa5'
        ? FontAwesome5
        : Ionicons;

  return (
    <FadeInView delay={index * 100} direction="up" distance={30}>
      <TouchableOpacity
        style={[styles.card, { width: CARD_SIZE, height: CARD_SIZE }]}
        onPress={onPress}
        activeOpacity={0.75}
        accessible={true}
        accessibilityLabel={item.label}
        accessibilityHint={item.accessibilityHint}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#1E1E1E', '#161616']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View
            style={[styles.iconCircle, { borderColor: item.color + '44' }]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <IconComponent name={item.icon} size={32} color={item.color} accessible={false} />
          </View>
          <Text style={styles.cardLabel} accessible={false}>
            {item.label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </FadeInView>
  );
}

function WeightModal({ visible, onClose }) {
  const { user, addWeight, updateUser } = useStore();
  const [selected, setSelected] = useState(user?.weight || 65);
  const [saving, setSaving] = useState(false);
  const weights = [];

  useEffect(() => {
    if (visible) {
      setSelected(user?.weight || 65);
    }
  }, [visible, user]);

  for (let w = 35; w <= 150; w += 0.5) {
    weights.push(Math.round(w * 10) / 10);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersAPI.addWeight(selected);
      addWeight(selected);
      updateUser({ weight: selected });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      AccessibilityInfo.announceForAccessibility(`המשקל עודכן ל-${selected.toFixed(1)} קילוגרם`);
      Alert.alert('✅ נשמר!', `המשקל עודכן ל-${selected.toFixed(1)} ק"ג`);
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לעדכן את המשקל כרגע');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          accessible={true}
          accessibilityLabel="סגור חלון עדכון משקל"
          accessibilityRole="button"
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} accessible={false} importantForAccessibility="no" />
          <Text style={styles.modalTitle} accessibilityRole="header" accessible={true}>
            עדכון משקל
          </Text>
          <Text style={styles.modalSubtitle} accessible={true}>
            בחרי את המשקל הנוכחי שלך
          </Text>

          <View
            style={styles.weightDisplay}
            accessible={true}
            accessibilityLabel={`משקל נבחר: ${selected.toFixed(1)} קילוגרם`}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.weightValue} accessible={false}>
              {selected.toFixed(1)}
            </Text>
            <Text style={styles.weightUnit} accessible={false}>
              ק״ג
            </Text>
          </View>

          <ScrollView
            style={styles.weightScroll}
            contentContainerStyle={styles.weightScrollContent}
            showsVerticalScrollIndicator={false}
            accessibilityLabel="רשימת משקלות לבחירה"
          >
            {weights.map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.weightItem, selected === w && styles.weightItemActive]}
                onPress={() => setSelected(w)}
                accessible={true}
                accessibilityLabel={`${w.toFixed(1)} קילוגרם`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === w }}
              >
                <Text
                  style={[styles.weightItemText, selected === w && styles.weightItemTextActive]}
                >
                  {w.toFixed(1)} ק״ג
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Button
            title={saving ? 'שומר...' : 'שמור'}
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={saving}
            accessibilityLabel={`שמרי משקל ${selected.toFixed(1)} קילוגרם`}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const user = useStore(s => s.user);
  const updateUser = useStore(s => s.updateUser);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pinnedMenu, setPinnedMenu] = useState(null);
  const [calorieSummary, setCalorieSummary] = useState({
    loading: true,
    targetCalories: 0,
    consumedCalories: 0,
    remainingCalories: null,
    hasTarget: false,
    error: '',
  });

  const maybeShowPinnedMenuAlert = useCallback(
    async menu => {
      const normalizedMenu = normalizePinnedMenu(menu);

      if (!hasPinnedMenuContent(normalizedMenu) || !normalizedMenu.updatedAt) {
        return;
      }

      const lastSeenUpdatedAt = await AsyncStorage.getItem(LAST_SEEN_PINNED_MENU_KEY);
      if (lastSeenUpdatedAt === normalizedMenu.updatedAt) {
        return;
      }

      await AsyncStorage.setItem(LAST_SEEN_PINNED_MENU_KEY, normalizedMenu.updatedAt);

      Alert.alert(
        'תפריט חדש משלהבת',
        `${normalizedMenu.title || 'תפריט אישי'} עודכן ונמצא עכשיו בנעוץ שלך.`,
        [
          { text: 'אחר כך', style: 'cancel' },
          {
            text: 'פתחי עכשיו',
            onPress: () => navigation.navigate('Nutrition'),
          },
        ]
      );
    },
    [navigation]
  );

  const loadCalorieSummary = useCallback(async () => {
    const todayDateKey = getFoodDiaryDateKey();
    const [meResult, planResult, diaryResult] = await Promise.allSettled([
      usersAPI.getMe(),
      usersAPI.getNutritionPlan(),
      usersAPI.getFoodDiary(todayDateKey),
    ]);

    if (meResult.status === 'fulfilled' && meResult.value?.user) {
      updateUser(meResult.value.user);
    }

    const nutritionPlan = planResult.status === 'fulfilled' ? planResult.value.nutritionPlan : null;
    const nextPinnedMenu = hasPinnedMenuContent(nutritionPlan?.pinnedMenu)
      ? normalizePinnedMenu(nutritionPlan.pinnedMenu)
      : null;
    const diaryEntry =
      diaryResult.status === 'fulfilled'
        ? normalizeFoodDiaryEntry(diaryResult.value.entry, todayDateKey)
        : normalizeFoodDiaryEntry(null, todayDateKey);
    const targetCalories = toNumber(nutritionPlan?.dailyTargets?.calories);
    const consumedCalories = Math.round(diaryEntry.totals.calories);
    const hasTarget = targetCalories > 0;
    const error =
      meResult.status === 'rejected'
        ? meResult.reason?.message || 'לא ניתן לטעון את פרטי הפרופיל'
        : planResult.status === 'rejected'
          ? planResult.reason?.message || 'לא ניתן לטעון את נתוני התזונה'
          : diaryResult.status === 'rejected'
            ? diaryResult.reason?.message || 'לא ניתן לטעון את יומן האכילה'
            : '';

    setPinnedMenu(nextPinnedMenu);
    if (nextPinnedMenu) {
      void maybeShowPinnedMenuAlert(nextPinnedMenu);
    }

    setCalorieSummary({
      loading: false,
      targetCalories,
      consumedCalories,
      remainingCalories: hasTarget ? Math.max(targetCalories - consumedCalories, 0) : null,
      hasTarget,
      error,
    });
  }, [maybeShowPinnedMenuAlert, updateUser]);

  useFocusEffect(
    useCallback(() => {
      loadCalorieSummary();
    }, [loadCalorieSummary])
  );

  const handleItemPress = item => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.id === 'weight') {
      setShowWeightModal(true);
    } else if (item.tab) {
      navigation.navigate(item.tab);
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const greeting = `${getGreeting()} ${user?.name || ''}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={styles.greeting}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={greeting}
          >
            {greeting},
          </Text>
          <View
            style={styles.logoWrap}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessible={false}
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View
          style={styles.statsRow}
          accessible={true}
          accessibilityLabel={`נתוני פרופיל: משקל ${user?.weight || '—'} קילוגרם, מטרה ${user?.goal || '—'}, מאמנת ${user?.coachName || '—'}`}
        >
          <View style={styles.statCard} accessible={false}>
            <Ionicons name="scale-outline" size={16} color={COLORS.primary} accessible={false} />
            <Text style={styles.statValue}>{user?.weight || '—'}</Text>
            <Text style={styles.statLabel}>ק״ג</Text>
          </View>
          <View style={[styles.statCard, styles.statDivider]} accessible={false} />
          <View style={styles.statCard} accessible={false}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.accent} accessible={false} />
            <Text style={styles.statValue}>{user?.goal || '—'}</Text>
            <Text style={styles.statLabel}>מטרה</Text>
          </View>
          <View style={[styles.statCard, styles.statDivider]} accessible={false} />
          <View style={styles.statCard} accessible={false}>
            <Ionicons name="person-outline" size={16} color={COLORS.info} accessible={false} />
            <Text style={styles.statValue} numberOfLines={1}>
              {user?.coachName || '—'}
            </Text>
            <Text style={styles.statLabel}>מאמנת</Text>
          </View>
        </View>

        {hasPinnedMenuContent(pinnedMenu) ? (
          <TouchableOpacity
            style={styles.pinnedMenuCard}
            onPress={() => navigation.navigate('Nutrition')}
            activeOpacity={0.88}
            accessible={true}
            accessibilityLabel="כרטיס תפריט נעוץ מהמאמנת"
            accessibilityHint="מעבר למסך התזונה לצפייה בתפריט המלא"
          >
            <View style={styles.pinnedMenuHeader}>
              <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
              <View style={styles.pinnedMenuHeaderText}>
                <Text style={styles.pinnedMenuTitle}>נעוץ מהמאמנת</Text>
                <Text style={styles.pinnedMenuSubtitle}>התפריט האחרון ששלהבת עדכנה עבורך</Text>
              </View>
              <View style={styles.pinnedMenuIconWrap}>
                <Ionicons name="pin" size={18} color={COLORS.primary} />
              </View>
            </View>

            <PinnedMenuCard
              menu={pinnedMenu}
              compact
              caption="נעוץ מהמאמנת"
            />
          </TouchableOpacity>
        ) : (
          <View style={[styles.pinnedMenuCard, { paddingVertical: 24 }]}>
            <View style={styles.pinnedMenuHeader}>
              <View style={styles.pinnedMenuHeaderText}>
                <Text style={styles.pinnedMenuTitle}>טרם נעוץ תפריט</Text>
                <Text style={styles.pinnedMenuSubtitle}>
                  שלהבת תקבע לך תפריט מותאם בקרוב 💛
                </Text>
              </View>
              <View style={styles.pinnedMenuIconWrap}>
                <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.calorieCard}
          onPress={() => navigation.navigate('Nutrition')}
          activeOpacity={0.85}
          accessible={true}
          accessibilityLabel="כרטיס מאזן קלוריות יומי"
          accessibilityHint="מעבר למסך התזונה עם פירוט היתרה הקלורית והיומן"
        >
          <View style={styles.calorieHeader}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
            <View style={styles.calorieHeaderText}>
              <Text style={styles.calorieTitle}>מאזן קלוריות להיום</Text>
              <Text style={styles.calorieSubtitle}>
                {calorieSummary.loading ? (
                  <Skeleton width={180} height={14} borderRadius={4} />
                ) : calorieSummary.hasTarget ? (
                  'מחושב לפי מה שנרשם ביומן האכילה שלך'
                ) : (
                  'כדי לחשב יתרה צריך יעד קלורי מהמאמנת'
                )}
              </Text>
            </View>
            <View style={styles.calorieIconWrap}>
              <Ionicons name="flame-outline" size={22} color={COLORS.primary} />
            </View>
          </View>

          <View style={styles.calorieMetricsRow}>
            <View style={styles.calorieMetric}>
              <View style={{ height: 28, justifyContent: 'center' }}>
                {calorieSummary.loading ? (
                  <Skeleton width={40} height={20} borderRadius={6} />
                ) : (
                  <Text style={styles.calorieMetricValue}>
                    {calorieSummary.hasTarget ? calorieSummary.remainingCalories : '—'}
                  </Text>
                )}
              </View>
              <Text style={styles.calorieMetricLabel}>נשארו</Text>
            </View>
            <View style={styles.calorieMetricDivider} />
            <View style={styles.calorieMetric}>
              <View style={{ height: 28, justifyContent: 'center' }}>
                {calorieSummary.loading ? (
                  <Skeleton width={40} height={20} borderRadius={6} />
                ) : (
                  <Text style={styles.calorieMetricValue}>{calorieSummary.consumedCalories}</Text>
                )}
              </View>
              <Text style={styles.calorieMetricLabel}>נאכל</Text>
            </View>
            <View style={styles.calorieMetricDivider} />
            <View style={styles.calorieMetric}>
              <View style={{ height: 28, justifyContent: 'center' }}>
                {calorieSummary.loading ? (
                  <Skeleton width={40} height={20} borderRadius={6} />
                ) : (
                  <Text style={styles.calorieMetricValue}>
                    {calorieSummary.hasTarget ? calorieSummary.targetCalories : '—'}
                  </Text>
                )}
              </View>
              <Text style={styles.calorieMetricLabel}>יעד</Text>
            </View>
          </View>

          {calorieSummary.error ? (
            <Text style={styles.calorieErrorText}>{calorieSummary.error}</Text>
          ) : null}
        </TouchableOpacity>

        {/* Grid */}
        <View style={styles.grid} accessible={false} importantForAccessibility="no">
          {MENU_ITEMS.map((item, index) => (
            <MenuCard
              key={item.id}
              item={item}
              index={index}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        {/* Motivational Footer */}
        <View
          style={styles.motivationCard}
          accessible={true}
          accessibilityLabel="לא דיאטה – הרגלים חדשים שנשארים. שלהבת מחטבת, מאמנת כושר אישית"
        >
          <Text style={styles.motivationIcon} accessible={false}>
            🔥
          </Text>
          <View style={styles.motivationText} accessible={false}>
            <Text style={styles.motivationTitle}>לא דיאטה – הרגלים חדשים שנשארים</Text>
            <Text style={styles.motivationSub}>שלהבת מחטבת | מאמנת כושר אישית</Text>
          </View>
        </View>
      </ScrollView>

      <WeightModal visible={showWeightModal} onClose={() => setShowWeightModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 14,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  calorieCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    padding: 16,
  },
  pinnedMenuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    padding: 16,
  },
  pinnedMenuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pinnedMenuHeaderText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  pinnedMenuTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  pinnedMenuSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'right',
  },
  pinnedMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginLeft: 12,
    width: 42,
  },
  calorieHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calorieHeaderText: { alignItems: 'flex-end', flex: 1 },
  calorieTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  calorieSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'right',
  },
  calorieIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginLeft: 12,
    width: 42,
  },
  calorieMetricsRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
  },
  calorieMetric: { alignItems: 'center', flex: 1 },
  calorieMetricValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  calorieMetricLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  calorieMetricDivider: {
    backgroundColor: COLORS.border,
    height: 34,
    width: 1,
  },
  calorieErrorText: {
    color: COLORS.warning,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'right',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    flex: 0,
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  statValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 20,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    gap: 12,
  },
  motivationIcon: {
    fontSize: 28,
  },
  motivationText: {
    flex: 1,
  },
  motivationTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  motivationSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
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
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  weightValue: {
    color: COLORS.primary,
    fontSize: 52,
    fontWeight: 'bold',
    lineHeight: 58,
  },
  weightUnit: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginBottom: 8,
  },
  weightScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  weightScrollContent: {
    alignItems: 'center',
    gap: 4,
  },
  weightItem: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '70%',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  weightItemActive: {
    backgroundColor: COLORS.primary + '33',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  weightItemText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  weightItemTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
