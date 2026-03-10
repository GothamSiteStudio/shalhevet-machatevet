import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Alert, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

const GOALS = ['חיטוב', 'עלייה במסת שריר', 'שימור', 'ירידה במשקל', 'אחר'];
const ACTIVITY_LEVELS = [
  { label: 'יושבני (מינימום פעילות)', value: 'יושבני' },
  { label: 'פעילות קלה (1-2 פעמים בשבוע)', value: 'קלה' },
  { label: 'פעילות מתונה (3-4 פעמים בשבוע)', value: 'מתונה' },
  { label: 'פעילות גבוהה (5+ פעמים בשבוע)', value: 'גבוהה' },
  { label: 'אינטנסיבי מאוד (ספורטאים)', value: 'אינטנסיבי מאוד' },
];
const NOTIFICATION_LEVELS = [
  { label: 'כל ההתראות', value: 'all' },
  { label: 'חשובות בלבד', value: 'important' },
  { label: 'ללא התראות', value: 'none' },
];
const LANGUAGES = [
  { label: 'עברית', value: 'he' },
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
];

function PickerModal({ visible, onClose, title, options, selected, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              const isSelected = val === selected;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionItem, isSelected && styles.optionItemActive]}
                  onPress={() => { onSelect(val); onClose(); }}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function EditProfileModal({ visible, onClose }) {
  const { user, updateUser } = useStore();
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(String(user.age));
  const [height, setHeight] = useState(String(user.height));

  const handleSave = () => {
    updateUser({ name, age: parseInt(age) || user.age, height: parseInt(height) || user.height });
    onClose();
    Alert.alert('✅ נשמר!', 'הפרטים עודכנו בהצלחה');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>עריכת פרטים אישיים</Text>
          <Text style={styles.inputLabel}>שם</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} textAlign="right" placeholderTextColor={COLORS.textMuted} />
          <Text style={styles.inputLabel}>גיל</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" textAlign="right" placeholderTextColor={COLORS.textMuted} />
          <Text style={styles.inputLabel}>גובה (ס"מ)</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" textAlign="right" placeholderTextColor={COLORS.textMuted} />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSave = () => {
    if (!current || !next) { Alert.alert('שגיאה', 'נא למלא את כל השדות'); return; }
    if (next !== confirm) { Alert.alert('שגיאה', 'הסיסמאות אינן תואמות'); return; }
    onClose();
    Alert.alert('✅ הסיסמה שונתה בהצלחה!');
    setCurrent(''); setNext(''); setConfirm('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>שינוי סיסמה</Text>
          <Text style={styles.inputLabel}>סיסמה נוכחית</Text>
          <TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry textAlign="right" placeholderTextColor={COLORS.textMuted} placeholder="סיסמה נוכחית" />
          <Text style={styles.inputLabel}>סיסמה חדשה</Text>
          <TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry textAlign="right" placeholderTextColor={COLORS.textMuted} placeholder="סיסמה חדשה" />
          <Text style={styles.inputLabel}>אימות סיסמה</Text>
          <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry textAlign="right" placeholderTextColor={COLORS.textMuted} placeholder="חזרי על הסיסמה החדשה" />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingRow({ icon, label, value, onPress, danger, iconColor }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
      <View style={styles.settingContent}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      </View>
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || COLORS.primary) + '22' }]}>
        <Ionicons name={icon} size={18} color={iconColor || COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, language, notificationLevel, setLanguage, setNotificationLevel, updateUser, logout } = useStore();
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showNotifPicker, setShowNotifPicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);

  const handleLogout = () => {
    Alert.alert('התנתקות', 'האם את בטוחה שתרצי להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתק', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'מחיקת חשבון',
      'פעולה זו אינה ניתנת לביטול. כל הנתונים שלך יימחקו.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק חשבון', style: 'destructive', onPress: logout },
      ]
    );
  };

  const currentLang = LANGUAGES.find((l) => l.value === language)?.label || 'עברית';
  const currentNotif = NOTIFICATION_LEVELS.find((l) => l.value === notificationLevel)?.label || 'כל ההתראות';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>פרופיל</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.profileImage} resizeMode="contain" />
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileCode}>קוד: {user.code}</Text>
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{user.weight}</Text>
              <Text style={styles.profileStatLabel}>משקל</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{user.age}</Text>
              <Text style={styles.profileStatLabel}>גיל</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{user.height}</Text>
              <Text style={styles.profileStatLabel}>גובה</Text>
            </View>
          </View>
          <View style={styles.coachBadge}>
            <MaterialCommunityIcons name="dumbbell" size={14} color={COLORS.primary} />
            <Text style={styles.coachBadgeText}>מאמנת: {user.coachName}</Text>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <SettingRow
            icon="language"
            label="שפה"
            value={currentLang}
            onPress={() => setShowLangPicker(true)}
            iconColor="#42A5F5"
          />
        </View>

        {/* Personal Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>מידע אישי</Text>
          <SettingRow
            icon="person-outline"
            label="שנה פרטים אישיים"
            onPress={() => setShowEditProfile(true)}
          />
          <SettingRow
            icon="trophy-outline"
            label="שנה מטרה"
            value={user.goal}
            onPress={() => setShowGoalPicker(true)}
            iconColor={COLORS.accent}
          />
          <SettingRow
            icon="fitness-outline"
            label="שנה רמת פעילות"
            value={user.activityLevel}
            onPress={() => setShowActivityPicker(true)}
            iconColor={COLORS.success}
          />
        </View>

        {/* App Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>הגדרות אפליקציה</Text>
          <SettingRow
            icon="notifications-outline"
            label="שנה הרשאת התראות"
            value={currentNotif}
            onPress={() => setShowNotifPicker(true)}
            iconColor={COLORS.warning}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="שינוי סיסמה"
            onPress={() => setShowChangePass(true)}
            iconColor="#AB47BC"
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.sectionCard}>
          <SettingRow
            icon="log-out-outline"
            label="התנתק"
            onPress={handleLogout}
            danger
            iconColor={COLORS.warning}
          />
          <SettingRow
            icon="trash-outline"
            label="מחיקת משתמש"
            onPress={handleDeleteAccount}
            danger
            iconColor={COLORS.danger}
          />
        </View>

        <Text style={styles.version}>גרסה 1.0.0 | שלהבת מחטבת 💪</Text>
      </ScrollView>

      {/* Modals */}
      <PickerModal
        visible={showGoalPicker}
        onClose={() => setShowGoalPicker(false)}
        title="בחרי מטרה"
        options={GOALS}
        selected={user.goal}
        onSelect={(v) => updateUser({ goal: v })}
      />
      <PickerModal
        visible={showActivityPicker}
        onClose={() => setShowActivityPicker(false)}
        title="בחרי רמת פעילות"
        options={ACTIVITY_LEVELS}
        selected={user.activityLevel}
        onSelect={(v) => updateUser({ activityLevel: v })}
      />
      <PickerModal
        visible={showNotifPicker}
        onClose={() => setShowNotifPicker(false)}
        title="הגדרות התראות"
        options={NOTIFICATION_LEVELS}
        selected={notificationLevel}
        onSelect={setNotificationLevel}
      />
      <PickerModal
        visible={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        title="בחרי שפה"
        options={LANGUAGES}
        selected={language}
        onSelect={setLanguage}
      />
      <EditProfileModal visible={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <ChangePasswordModal visible={showChangePass} onClose={() => setShowChangePass(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  pageTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 16, marginBottom: 20 },
  profileCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  profileImageWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.cardLight,
    borderWidth: 2.5, borderColor: COLORS.primary, overflow: 'hidden',
    marginBottom: 12, alignItems: 'center', justifyContent: 'center',
  },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  profileName: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  profileCode: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
  profileStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 14 },
  profileStat: { alignItems: 'center', gap: 4 },
  profileStatVal: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  profileStatLabel: { color: COLORS.textMuted, fontSize: 11 },
  profileStatDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  coachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '22', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  coachBadgeText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  section: { backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  sectionCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'right', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border + '88',
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  settingContent: { flex: 1, alignItems: 'flex-end' },
  settingLabel: { color: COLORS.white, fontSize: 15 },
  settingLabelDanger: { color: COLORS.danger },
  settingValue: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 1 },
  version: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '80%', flexShrink: 1,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  optionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  optionItemActive: { backgroundColor: COLORS.primary + '11' },
  optionText: { color: COLORS.white, fontSize: 15, flex: 1, textAlign: 'right' },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  closeBtn: {
    backgroundColor: COLORS.cardLight, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  closeBtnText: { color: COLORS.white, fontSize: 15 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 14, textAlign: 'right',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  submitBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.primary },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
});
