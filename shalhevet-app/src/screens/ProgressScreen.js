import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

// Custom Bar Chart Component
function BarChart({ data, maxVal, color }) {
  return (
    <View style={chartStyles.container}>
      {data.map((item, i) => {
        const pct = maxVal > 0 ? item.steps / maxVal : 0;
        const barH = Math.max(pct * 120, 4);
        return (
          <View key={i} style={chartStyles.barWrapper}>
            <Text style={chartStyles.barVal}>{item.steps >= 1000 ? `${(item.steps / 1000).toFixed(1)}k` : item.steps}</Text>
            <View style={[chartStyles.bar, { height: barH, backgroundColor: color }]} />
            <Text style={chartStyles.barLabel}>{item.date}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, paddingBottom: 24 },
  barWrapper: { alignItems: 'center', gap: 4, flex: 1 },
  bar: { width: '60%', borderRadius: 4, minHeight: 4 },
  barLabel: { color: COLORS.textMuted, fontSize: 9, textAlign: 'center' },
  barVal: { color: COLORS.textSecondary, fontSize: 8, textAlign: 'center' },
});

// Weight Line Chart
function WeightChart({ data }) {
  if (!data || data.length < 2) return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <Text style={{ color: COLORS.textMuted }}>אין מספיק נתוני משקל</Text>
    </View>
  );
  const vals = data.map((d) => d.weight);
  const minW = Math.min(...vals) - 1;
  const maxW = Math.max(...vals) + 1;
  const range = maxW - minW || 1;
  const W = CHART_WIDTH - 40;
  const H = 120;
  return (
    <View style={{ height: H + 30, width: W + 40 }}>
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * W + 20;
        const y = H - ((d.weight - minW) / range) * H;
        return (
          <View key={i} style={{ position: 'absolute', left: x - 3, top: y - 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ color: COLORS.textMuted, fontSize: 9 }}>{d.date.slice(5)}</Text>
        ))}
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 20 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 9 }}>{maxW.toFixed(0)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: COLORS.textMuted, fontSize: 9 }}>{minW.toFixed(0)}</Text>
      </View>
    </View>
  );
}

// Activity Heatmap
function HeatMap({ activityHistory, filter }) {
  const days = [];
  const today = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const activity = activityHistory[key] || [];
    let hasActivity = false;
    if (filter === 'all') hasActivity = activity.length > 0;
    else hasActivity = activity.includes(filter);
    days.push({ key, hasActivity, date: d });
  }
  return (
    <View style={heatStyles.container}>
      {days.map((d, i) => (
        <View
          key={i}
          style={[
            heatStyles.cell,
            d.hasActivity && heatStyles.cellActive,
            d.key === today.toISOString().split('T')[0] && heatStyles.cellToday,
          ]}
        />
      ))}
    </View>
  );
}

const heatStyles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 20, height: 20, borderRadius: 4, backgroundColor: COLORS.cardLight },
  cellActive: { backgroundColor: COLORS.primary },
  cellToday: { borderWidth: 1.5, borderColor: COLORS.accent },
});

// Measurement Modal
function MeasurementModal({ visible, onClose }) {
  const addMeasurement = useStore((s) => s.addMeasurement);
  const [measurements, setMeasurements] = useState({
    chest: '', waist: '', hips: '', arm: '', thigh: '',
  });
  const labels = { chest: 'חזה (ס"מ)', waist: 'מותן (ס"מ)', hips: 'ירכיים (ס"מ)', arm: 'זרוע (ס"מ)', thigh: 'ירך (ס"מ)' };

  const handleSave = () => {
    const data = {};
    Object.entries(measurements).forEach(([k, v]) => { if (v) data[k] = parseFloat(v); });
    if (Object.keys(data).length === 0) { Alert.alert('שגיאה', 'נא למלא לפחות מדידה אחת'); return; }
    addMeasurement(data);
    onClose();
    Alert.alert('✅ נשמר!', 'המדידות נשמרו בהצלחה');
    setMeasurements({ chest: '', waist: '', hips: '', arm: '', thigh: '' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>הוסיפי מדידה</Text>
          <Text style={styles.modalSub}>רשמי את ההיקפים שלך בס"מ</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(labels).map(([key, label]) => (
              <View key={key} style={styles.measureRow}>
                <View style={styles.measureInput}>
                  <Text style={styles.measureInputText}>
                    {measurements[key] || '—'}
                  </Text>
                </View>
                <Text style={styles.measureLabel}>{label}</Text>
              </View>
            ))}
            <View style={styles.measureQuickRow}>
              {[5, 10, 20, 30, 50, 60, 70, 80, 90, 100].map((n) => (
                <TouchableOpacity key={n} style={styles.measureQuickBtn}
                  onPress={() => {
                    const keys = Object.keys(labels);
                    const empty = keys.find((k) => !measurements[k]);
                    if (empty) setMeasurements({ ...measurements, [empty]: String(n) });
                  }}>
                  <Text style={styles.measureQuickBtnText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>שמור מדידות</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const HEATMAP_FILTERS = [
  { id: 'all', label: 'הכל' },
  { id: 'aerobic', label: 'אירובי' },
  { id: 'workout', label: 'אימונים' },
];

export default function ProgressScreen({ navigation }) {
  const { weightHistory, stepsHistory, activityHistory, measurements, user } = useStore();
  const [heatFilter, setHeatFilter] = useState('all');
  const [showMeasureModal, setShowMeasureModal] = useState(false);

  const maxSteps = Math.max(...stepsHistory.map((d) => d.steps), 1);
  const avgSteps = Math.round(stepsHistory.reduce((s, d) => s + d.steps, 0) / stepsHistory.length);
  const bestSteps = Math.max(...stepsHistory.map((d) => d.steps));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle} accessibilityRole="header">התקדמות</Text>
        </View>

        {/* Weight Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.currentWeight}>{user.weight} ק"ג</Text>
            <Text style={styles.cardTitle}>מעקב משקל</Text>
          </View>
          <WeightChart data={weightHistory} />
          <View style={styles.weightStats}>
            <View style={styles.weightStat}>
              <Text style={styles.weightStatVal}>{weightHistory[0]?.weight || '—'}</Text>
              <Text style={styles.weightStatLabel}>התחלה</Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={[styles.weightStatVal, { color: COLORS.success }]}>
                {(weightHistory[0]?.weight - user.weight).toFixed(1) || '—'}
              </Text>
              <Text style={styles.weightStatLabel}>ירידה</Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={styles.weightStatVal}>{user.weight}</Text>
              <Text style={styles.weightStatLabel}>כעת</Text>
            </View>
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: 'right', marginBottom: 12 }]}>סקירת פעילות</Text>
          <View style={styles.filterRow}>
            {HEATMAP_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, heatFilter === f.id && styles.filterBtnActive]}
                onPress={() => setHeatFilter(f.id)}
              >
                <Text style={[styles.filterBtnText, heatFilter === f.id && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <HeatMap activityHistory={activityHistory} filter={heatFilter} />
          <View style={styles.heatLegend}>
            <View style={styles.heatLegendItem}>
              <View style={[styles.heatDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.heatLegendText}>פעיל</Text>
            </View>
            <View style={styles.heatLegendItem}>
              <View style={[styles.heatDot, { backgroundColor: COLORS.cardLight }]} />
              <Text style={styles.heatLegendText}>לא פעיל</Text>
            </View>
            <View style={styles.heatLegendItem}>
              <View style={[styles.heatDot, { borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: 'transparent' }]} />
              <Text style={styles.heatLegendText}>היום</Text>
            </View>
          </View>
        </View>

        {/* Steps History */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: 'right', marginBottom: 4 }]}>צעדים יומיים</Text>
          <View style={styles.stepsStats}>
            <View style={styles.stepsStat}>
              <Text style={styles.stepsStatVal}>{bestSteps.toLocaleString()}</Text>
              <Text style={styles.stepsStatLabel}>הכי טוב</Text>
            </View>
            <View style={styles.stepsStat}>
              <Text style={styles.stepsStatVal}>{avgSteps.toLocaleString()}</Text>
              <Text style={styles.stepsStatLabel}>ממוצע</Text>
            </View>
          </View>
          <BarChart data={stepsHistory} maxVal={maxSteps} color={COLORS.primary} />
        </View>

        {/* Body Measurements */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: 'right', marginBottom: 12 }]}>מדידות גוף</Text>
          {measurements.length === 0 ? (
            <TouchableOpacity style={styles.addMeasureBtn} onPress={() => setShowMeasureModal(true)}>
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.addMeasureBtnText}>הוסיפי מדידה ראשונה</Text>
            </TouchableOpacity>
          ) : (
            <>
              {measurements.slice(-1).map((m, i) => (
                <View key={i}>
                  <Text style={styles.measureDate}>{new Date(m.date).toLocaleDateString('he-IL')}</Text>
                  <View style={styles.measureGrid}>
                    {m.chest && <View style={styles.measureItem}><Text style={styles.measureVal}>{m.chest}</Text><Text style={styles.measureLbl}>חזה</Text></View>}
                    {m.waist && <View style={styles.measureItem}><Text style={styles.measureVal}>{m.waist}</Text><Text style={styles.measureLbl}>מותן</Text></View>}
                    {m.hips && <View style={styles.measureItem}><Text style={styles.measureVal}>{m.hips}</Text><Text style={styles.measureLbl}>ירכיים</Text></View>}
                    {m.arm && <View style={styles.measureItem}><Text style={styles.measureVal}>{m.arm}</Text><Text style={styles.measureLbl}>זרוע</Text></View>}
                    {m.thigh && <View style={styles.measureItem}><Text style={styles.measureVal}>{m.thigh}</Text><Text style={styles.measureLbl}>ירך</Text></View>}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowMeasureModal(true)}>
                <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.addMoreText}>הוסיפי מדידה חדשה</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      <MeasurementModal visible={showMeasureModal} onClose={() => setShowMeasureModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, marginBottom: 20, position: 'relative' },
  backBtn: { position: 'absolute', right: 0, padding: 4 },
  pageTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  currentWeight: { color: COLORS.primary, fontSize: 36, fontWeight: 'bold' },
  weightStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  weightStat: { alignItems: 'center', gap: 4 },
  weightStatVal: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  weightStatLabel: { color: COLORS.textMuted, fontSize: 11 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardLight },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnText: { color: COLORS.textSecondary, fontSize: 12 },
  filterBtnTextActive: { color: COLORS.white, fontWeight: 'bold' },
  heatLegend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'flex-end' },
  heatLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatDot: { width: 10, height: 10, borderRadius: 2 },
  heatLegendText: { color: COLORS.textMuted, fontSize: 11 },
  stepsStats: { flexDirection: 'row', gap: 20, marginBottom: 8, justifyContent: 'flex-end' },
  stepsStat: { alignItems: 'center' },
  stepsStatVal: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  stepsStatLabel: { color: COLORS.textMuted, fontSize: 11 },
  addMeasureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary + '22', borderRadius: 12,
    paddingVertical: 16, borderWidth: 1, borderColor: COLORS.primary + '44', borderStyle: 'dashed',
  },
  addMeasureBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  measureDate: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 8 },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  measureItem: { alignItems: 'center', backgroundColor: COLORS.cardLight, borderRadius: 10, padding: 10, minWidth: 60 },
  measureVal: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  measureLbl: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  addMoreText: { color: COLORS.primary, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  modalSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  measureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 12 },
  measureLabel: { color: COLORS.white, fontSize: 14, width: 100, textAlign: 'right' },
  measureInput: { backgroundColor: COLORS.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, width: 80, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  measureInputText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  measureQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  measureQuickBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border },
  measureQuickBtnText: { color: COLORS.textSecondary, fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  submitBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.primary },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
});
