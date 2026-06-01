/**
 * ExerciseLibraryScreen.js — ספריית תרגילים (All-in-Fit)
 * צפייה: לכולם. הוספה/עריכה: למאמנת בלבד. מחובר ל-Supabase (טבלת exercises).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { exercisesAPI } from '../services/api';
import useStore from '../store/useStore';
import DismissKeyboardView from '../components/ui/DismissKeyboardView';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '../utils/keyboard';

function Chips({ value, items, onSelect, prefix }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
      <View style={styles.chipsRow}>
        {items.map(item => {
          const active = value === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${prefix} ${item.label}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ExerciseCard({ item, onPress }) {
  const muscles = Array.isArray(item.muscleGroups) ? item.muscleGroups : [];
  const equipment = Array.isArray(item.equipment) ? item.equipment : [];
  const a11y = [item.name, muscles.length ? `שרירים: ${muscles.join(', ')}` : null,
    equipment.length ? `ציוד: ${equipment.join(', ')}` : null].filter(Boolean).join('. ');
  return (
    <TouchableOpacity
      style={styles.exCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="לחצי לצפייה בפרטי התרגיל"
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.exThumb} resizeMode="cover" accessible={false} />
      ) : (
        <View style={styles.exIcon}>
          <Ionicons name="barbell-outline" size={24} color={COLORS.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.exName}>{item.name}</Text>
        {muscles.length ? (
          <View style={styles.badgeRow}>
            {muscles.slice(0, 3).map(m => (
              <View key={m} style={styles.badge}>
                <Text style={styles.badgeText}>{m}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {equipment.length ? <Text style={styles.exMeta}>🏋️ {equipment.join(' · ')}</Text> : null}
      </View>
      <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function AddExerciseModal({ visible, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName(''); setMuscles(''); setEquipment(''); setDescription('');
    }
  }, [visible]);

  const splitList = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!name.trim()) {
      AccessibilityInfo.announceForAccessibility('נא להזין שם תרגיל');
      Alert.alert('שגיאה', 'שם התרגיל הוא שדה חובה');
      return;
    }
    setLoading(true);
    try {
      await exercisesAPI.create({
        name: name.trim(),
        muscleGroups: splitList(muscles),
        equipment: splitList(equipment),
        description: description.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשמור');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle} accessibilityRole="header">תרגיל חדש</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>שם התרגיל *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="לדוגמה: סקוואט" placeholderTextColor={COLORS.textMuted} textAlign="right"
                accessibilityLabel="שם התרגיל" />
              <Text style={styles.label}>קבוצות שרירים (מופרד בפסיקים)</Text>
              <TextInput style={styles.input} value={muscles} onChangeText={setMuscles}
                placeholder="רגליים, ישבן" placeholderTextColor={COLORS.textMuted} textAlign="right"
                accessibilityLabel="קבוצות שרירים" />
              <Text style={styles.label}>ציוד (מופרד בפסיקים)</Text>
              <TextInput style={styles.input} value={equipment} onChangeText={setEquipment}
                placeholder="מוט, משקולות" placeholderTextColor={COLORS.textMuted} textAlign="right"
                accessibilityLabel="ציוד" />
              <Text style={styles.label}>הסבר ביצוע</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} value={description} onChangeText={setDescription}
                placeholder="תיאור קצר של ביצוע התרגיל" placeholderTextColor={COLORS.textMuted}
                textAlign="right" multiline accessibilityLabel="הסבר ביצוע" />
            </ScrollView>
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button"
                accessibilityLabel="ביטול">
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}
                accessibilityRole="button" accessibilityLabel="שמירת תרגיל"
                accessibilityState={{ disabled: loading, busy: loading }}>
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>שמירה</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

export default function ExerciseLibraryScreen({ navigation }) {
  const role = useStore(s => s.user?.role);
  const isCoach = role === 'coach';
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await exercisesAPI.list();
      setExercises(res.exercises || []);
    } catch (err) {
      Alert.alert('שגיאה בטעינה', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const muscleFilters = useMemo(() => {
    const set = new Set();
    exercises.forEach(e => (Array.isArray(e.muscleGroups) ? e.muscleGroups : []).forEach(m => set.add(m)));
    return [{ id: 'all', label: 'הכל' }, ...[...set].map(m => ({ id: m, label: m }))];
  }, [exercises]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter(e => {
      const okSearch = !q || e.name?.toLowerCase().includes(q);
      const okMuscle = muscle === 'all' || (Array.isArray(e.muscleGroups) && e.muscleGroups.includes(muscle));
      return okSearch && okMuscle;
    });
  }, [exercises, search, muscle]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}
          accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">ספריית תרגילים</Text>
        {isCoach ? (
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.iconBtn}
            accessibilityRole="button" accessibilityLabel="הוספת תרגיל חדש"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add-circle-outline" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
        <TextInput style={styles.searchInput} placeholder="חיפוש תרגיל..." placeholderTextColor={COLORS.textMuted}
          value={search} onChangeText={setSearch} textAlign="right" accessibilityLabel="חיפוש תרגיל" />
      </View>

      {muscleFilters.length > 1 ? (
        <Chips value={muscle} items={muscleFilters} onSelect={setMuscle} prefix="סינון לפי שריר" />
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{exercises.length === 0 ? 'הספרייה ריקה' : 'לא נמצאו תרגילים'}</Text>
          <Text style={styles.emptyText}>
            {exercises.length === 0
              ? (isCoach ? 'לחצי על + להוספת התרגיל הראשון' : 'המאמנת עדיין לא הוסיפה תרגילים')
              : 'נסי חיפוש או סינון אחר'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          renderItem={({ item }) => <ExerciseCard item={item} onPress={() => setDetail(item)} />}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)} accessibilityViewIsModal>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {detail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {detail.imageUrl ? (
                  <Image
                    source={{ uri: detail.imageUrl }}
                    style={styles.detailImage}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel={`תמונת התרגיל ${detail.name}`}
                  />
                ) : null}
                <Text style={styles.sheetTitle} accessibilityRole="header">{detail.name}</Text>
                {Array.isArray(detail.muscleGroups) && detail.muscleGroups.length ? (
                  <>
                    <Text style={styles.label}>קבוצות שרירים</Text>
                    <View style={styles.badgeRow}>
                      {detail.muscleGroups.map(m => (
                        <View key={m} style={styles.badge}><Text style={styles.badgeText}>{m}</Text></View>
                      ))}
                    </View>
                  </>
                ) : null}
                {Array.isArray(detail.equipment) && detail.equipment.length ? (
                  <Text style={[styles.detailText, { marginTop: 10 }]}>🏋️ ציוד: {detail.equipment.join(' · ')}</Text>
                ) : null}
                {detail.description ? <Text style={[styles.detailText, { marginTop: 12 }]}>{detail.description}</Text> : null}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 12 }]} onPress={() => setDetail(null)}
              accessibilityRole="button" accessibilityLabel="סגירה">
              <Text style={styles.saveBtnText}>סגירה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AddExerciseModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: COLORS.cardLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badgeText: { color: COLORS.textSecondary, fontSize: 12 },
  cancelBtn: { alignItems: 'center', borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 50 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  center: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', padding: 32 },
  chip: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: '#E5393533', borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13 },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
  chipsRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16 },
  chipsScroll: { marginTop: 12, maxHeight: 44 },
  detailImage: { backgroundColor: COLORS.cardLight, borderRadius: 12, height: 240, marginBottom: 12, width: '100%' },
  detailText: { color: COLORS.text, fontSize: 15, lineHeight: 22, textAlign: 'right' },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold', marginTop: 8 },
  exCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 10,
    minHeight: 72,
    padding: 14,
  },
  exIcon: { alignItems: 'center', backgroundColor: '#E5393522', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 6, textAlign: 'right' },
  exName: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  exThumb: { backgroundColor: COLORS.cardLight, borderRadius: 12, height: 46, width: 46 },
  handle: { alignSelf: 'center', backgroundColor: COLORS.borderLight, borderRadius: 2, height: 4, marginBottom: 14, width: 40 },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: COLORS.white, flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  iconBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'right',
  },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 8, textAlign: 'right' },
  overlay: { backgroundColor: '#00000088', flex: 1, justifyContent: 'flex-end' },
  safe: { backgroundColor: COLORS.background, flex: 1 },
  saveBtn: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 14, flex: 1, justifyContent: 'center', minHeight: 50 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  searchInput: { color: COLORS.white, flex: 1, fontSize: 15, paddingVertical: 10, textAlign: 'right' },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    marginHorizontal: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
    padding: 20,
  },
  sheetBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 16 },
  sheetTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
});
