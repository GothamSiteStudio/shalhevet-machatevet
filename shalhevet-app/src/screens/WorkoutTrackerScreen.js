/**
 * WorkoutTrackerScreen.js — מעקב אימונים (All-in-Fit)
 * רישום אימון (תרגילים + סטים), נפח, רצף שבועי, שיאים והיסטוריה. מחובר ל-Supabase.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { workoutsAPI } from '../services/api';
import DismissKeyboardView from '../components/ui/DismissKeyboardView';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '../utils/keyboard';

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function sessionVolume(exercises) {
  let v = 0;
  (exercises || []).forEach(ex =>
    (ex.sets || []).forEach(s => {
      v += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    })
  );
  return v;
}

function StatCard({ value, label, icon, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]} accessible accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SessionCard({ session, onDelete }) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  const setsCount = exercises.reduce((n, ex) => n + (Array.isArray(ex.sets) ? ex.sets.length : 0), 0);
  return (
    <View style={styles.sessionCard} accessible accessibilityRole="text"
      accessibilityLabel={`אימון מ-${formatDate(session.performedAt)}, ${exercises.length} תרגילים, נפח ${Math.round(session.totalVolume || sessionVolume(exercises))}`}>
      <View style={styles.sessionHeader}>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button" accessibilityLabel="מחיקת אימון">
          <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.sessionDate}>{formatDate(session.performedAt)}</Text>
      </View>
      <View style={styles.sessionMetaRow}>
        <Text style={styles.sessionMeta}>{exercises.length} תרגילים · {setsCount} סטים</Text>
        <Text style={styles.sessionVolume}>נפח {Math.round(session.totalVolume || sessionVolume(exercises))} ק״ג</Text>
      </View>
      {exercises.slice(0, 4).map((ex, i) => (
        <Text key={i} style={styles.sessionExercise}>
          • {ex.name || 'תרגיל'} ({(ex.sets || []).length} סטים)
        </Text>
      ))}
      {session.notes ? <Text style={styles.sessionNotes}>{session.notes}</Text> : null}
    </View>
  );
}

function LoggerModal({ visible, onClose, onSaved }) {
  const [exercises, setExercises] = useState([{ name: '', sets: [{ reps: '', weight: '' }] }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setExercises([{ name: '', sets: [{ reps: '', weight: '' }] }]);
      setNotes('');
    }
  }, [visible]);

  const updateExercise = (i, patch) =>
    setExercises(prev => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  const updateSet = (ei, si, patch) =>
    setExercises(prev =>
      prev.map((ex, idx) =>
        idx === ei ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : ex
      )
    );
  const addExercise = () => setExercises(prev => [...prev, { name: '', sets: [{ reps: '', weight: '' }] }]);
  const removeExercise = i => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const addSet = ei =>
    setExercises(prev => prev.map((ex, idx) => (idx === ei ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] } : ex)));
  const removeSet = (ei, si) =>
    setExercises(prev => prev.map((ex, idx) => (idx === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex)));

  const liveVolume = sessionVolume(
    exercises.map(ex => ({ sets: ex.sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })) }))
  );

  const handleSave = async () => {
    const clean = exercises
      .map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets
          .filter(s => s.reps !== '' || s.weight !== '')
          .map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
      }))
      .filter(ex => ex.name && ex.sets.length);
    if (!clean.length) {
      AccessibilityInfo.announceForAccessibility('נא להוסיף לפחות תרגיל אחד עם סט');
      Alert.alert('שגיאה', 'נא להוסיף לפחות תרגיל אחד עם סט אחד');
      return;
    }
    setSaving(true);
    try {
      await workoutsAPI.create({ exercises: clean, notes: notes.trim() });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור אימון');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <DismissKeyboardView style={styles.flex}>
        <KeyboardAvoidingView style={styles.overlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle} accessibilityRole="header">רישום אימון</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {exercises.map((ex, ei) => (
                <View key={ei} style={styles.exBlock}>
                  <View style={styles.exBlockHeader}>
                    {exercises.length > 1 ? (
                      <TouchableOpacity onPress={() => removeExercise(ei)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button" accessibilityLabel={`הסרת תרגיל ${ei + 1}`}>
                        <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ) : <View />}
                    <TextInput style={styles.exNameInput} value={ex.name}
                      onChangeText={t => updateExercise(ei, { name: t })}
                      placeholder={`תרגיל ${ei + 1}`} placeholderTextColor={COLORS.textMuted}
                      textAlign="right" accessibilityLabel={`שם תרגיל ${ei + 1}`} />
                  </View>
                  <View style={styles.setHeaderRow}>
                    <Text style={styles.setHeaderCol}>משקל</Text>
                    <Text style={styles.setHeaderCol}>חזרות</Text>
                    <Text style={styles.setHeaderIndex}>סט</Text>
                  </View>
                  {ex.sets.map((s, si) => (
                    <View key={si} style={styles.setRow}>
                      {ex.sets.length > 1 ? (
                        <TouchableOpacity onPress={() => removeSet(ei, si)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityRole="button" accessibilityLabel={`הסרת סט ${si + 1}`}>
                          <Ionicons name="remove-circle-outline" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      ) : <View style={styles.setRemoveSpacer} />}
                      <TextInput style={styles.setInput} value={String(s.weight)}
                        onChangeText={t => updateSet(ei, si, { weight: t })} keyboardType="numeric"
                        placeholder="0" placeholderTextColor={COLORS.textMuted} textAlign="center"
                        accessibilityLabel={`משקל סט ${si + 1}`} />
                      <TextInput style={styles.setInput} value={String(s.reps)}
                        onChangeText={t => updateSet(ei, si, { reps: t })} keyboardType="numeric"
                        placeholder="0" placeholderTextColor={COLORS.textMuted} textAlign="center"
                        accessibilityLabel={`חזרות סט ${si + 1}`} />
                      <Text style={styles.setIndex}>{si + 1}</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ei)}
                    accessibilityRole="button" accessibilityLabel="הוספת סט">
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addSetText}>הוספת סט</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addExBtn} onPress={addExercise}
                accessibilityRole="button" accessibilityLabel="הוספת תרגיל">
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addExText}>הוספת תרגיל</Text>
              </TouchableOpacity>
              <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes}
                placeholder="הערות לאימון (אופציונלי)" placeholderTextColor={COLORS.textMuted}
                textAlign="right" multiline accessibilityLabel="הערות לאימון" />
              <Text style={styles.volumeHint}>נפח כולל: {Math.round(liveVolume)} ק״ג</Text>
            </ScrollView>
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}
                accessibilityRole="button" accessibilityLabel="ביטול">
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}
                accessibilityRole="button" accessibilityLabel="שמירת אימון"
                accessibilityState={{ disabled: saving, busy: saving }}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>שמירה</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

export default function WorkoutTrackerScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogger, setShowLogger] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sRes, stRes] = await Promise.all([workoutsAPI.list(), workoutsAPI.stats()]);
      setSessions(sRes.sessions || []);
      setStats(stRes.stats || null);
    } catch (err) {
      Alert.alert('שגיאה בטעינה', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = session => {
    Alert.alert('מחיקת אימון', `למחוק את האימון מ-${formatDate(session.performedAt)}?`, [
      { text: 'ביטול' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          try {
            await workoutsAPI.remove(session.id);
            load();
          } catch (err) {
            Alert.alert('שגיאה', err.message);
          }
        },
      },
    ]);
  };

  const header = (
    <View>
      {stats ? (
        <View style={styles.statsRow}>
          <StatCard value={stats.thisWeekCount} label="אימונים השבוע" icon="flame-outline" color={COLORS.primary} />
          <StatCard value={stats.streak} label="רצף שבועות" icon="trophy-outline" color="#FFA726" />
          <StatCard value={stats.sessionsCount} label="סך הכל" icon="barbell-outline" color="#42A5F5" />
        </View>
      ) : null}

      {stats && stats.prs && stats.prs.length ? (
        <View style={styles.prCard}>
          <Text style={styles.prTitle}>🏆 שיאים אישיים</Text>
          {stats.prs.slice(0, 5).map(pr => (
            <View key={pr.name} style={styles.prRow}>
              <Text style={styles.prWeight}>{pr.weight} ק״ג</Text>
              <Text style={styles.prName} numberOfLines={1}>{pr.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogger(true)}
        accessibilityRole="button" accessibilityLabel="רישום אימון חדש">
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.logBtnText}>רישום אימון חדש</Text>
      </TouchableOpacity>

      <Text style={styles.historyTitle}>היסטוריית אימונים</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}
          accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.topTitle} accessibilityRole="header">מעקב אימונים</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          renderItem={({ item }) => <SessionCard session={item} onDelete={() => handleDelete(item)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>עדיין אין אימונים</Text>
              <Text style={styles.emptyText}>לחצי על כפתור הרישום כדי להתחיל את האימון הראשון</Text>
            </View>
          }
        />
      )}

      <LoggerModal visible={showLogger} onClose={() => setShowLogger(false)} onSaved={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addExBtn: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
  },
  addExText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  addSetBtn: { alignItems: 'center', flexDirection: 'row-reverse', gap: 4, justifyContent: 'center', marginTop: 10, minHeight: 40 },
  addSetText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 50 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  center: { alignItems: 'center', gap: 8, justifyContent: 'center', padding: 40 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold', marginTop: 8 },
  exBlock: {
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  exBlockHeader: { alignItems: 'center', flexDirection: 'row-reverse', gap: 10 },
  exNameInput: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.white,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
  },
  flex: { flex: 1 },
  handle: { alignSelf: 'center', backgroundColor: COLORS.borderLight, borderRadius: 2, height: 4, marginBottom: 14, width: 40 },
  historyTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  iconBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  listContent: { padding: 16, paddingTop: 4 },
  logBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
    minHeight: 52,
  },
  logBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  notesInput: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 15,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'right',
  },
  overlay: { backgroundColor: '#00000088', flex: 1, justifyContent: 'flex-end' },
  prCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  prName: { color: COLORS.text, flex: 1, fontSize: 14, textAlign: 'right' },
  prRow: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 5 },
  prTitle: { color: COLORS.white, fontSize: 15, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  prWeight: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold', marginLeft: 12 },
  safe: { backgroundColor: COLORS.background, flex: 1 },
  saveBtn: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 14, flex: 1, justifyContent: 'center', minHeight: 50 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  sessionCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  sessionDate: { color: COLORS.white, fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  sessionExercise: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2, textAlign: 'right' },
  sessionHeader: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  sessionMeta: { color: COLORS.textSecondary, fontSize: 13 },
  sessionMetaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 },
  sessionNotes: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 6, textAlign: 'right' },
  sessionVolume: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  setHeaderCol: { color: COLORS.textMuted, flex: 1, fontSize: 12, textAlign: 'center' },
  setHeaderIndex: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', width: 28 },
  setHeaderRow: { alignItems: 'center', flexDirection: 'row-reverse', gap: 10, marginTop: 10, paddingHorizontal: 4 },
  setIndex: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center', width: 28 },
  setInput: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.white,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingVertical: 10,
  },
  setRemoveSpacer: { width: 20 },
  setRow: { alignItems: 'center', flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  sheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '92%',
    padding: 20,
  },
  sheetBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 16 },
  sheetTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  statCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 14 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topTitle: { color: COLORS.white, flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  volumeHint: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'right' },
});
