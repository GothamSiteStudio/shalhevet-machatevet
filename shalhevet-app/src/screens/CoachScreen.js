import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput, Alert, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {icon && <Ionicons name={icon} size={18} color={COLORS.primary} />}
    </View>
  );
}

function MeetingRequestModal({ visible, onClose }) {
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const requestMeeting = useStore((s) => s.requestMeeting);

  const handleSubmit = () => {
    if (!date) { Alert.alert('שגיאה', 'נא להזין תאריך מבוקש'); return; }
    requestMeeting(date, notes);
    onClose();
    Alert.alert('✅ נשלח!', 'בקשת הפגישה נשלחה לשלהבת. היא תאשר בהקדם!');
    setDate(''); setNotes('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>בקשת פגישה</Text>
          <Text style={styles.modalSub}>שלח בקשה לפגישה עם שלהבת</Text>
          <Text style={styles.inputLabel}>תאריך מבוקש</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: יום ב׳ 10:00"
            placeholderTextColor={COLORS.textMuted}
            value={date}
            onChangeText={setDate}
            textAlign="right"
          />
          <Text style={styles.inputLabel}>הערות (אופציונלי)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="נושא הפגישה, שאלות וכו׳..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>שלח בקשה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UpdateFormModal({ visible, onClose }) {
  const [text, setText] = useState('');
  const sendUpdate = useStore((s) => s.sendUpdate);

  const handleSubmit = () => {
    if (!text.trim()) { Alert.alert('שגיאה', 'נא לכתוב עדכון'); return; }
    sendUpdate(text.trim());
    onClose();
    Alert.alert('✅ נשלח!', 'העדכון נשלח לשלהבת בהצלחה!');
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>שלחי עדכון שבועי</Text>
          <Text style={styles.modalSub}>ספרי לשלהבת איך הולך השבוע</Text>
          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder="עדכוני על המשקל, האימונים, התזונה, איך את מרגישה..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={5}
            textAlign="right"
            textAlignVertical="top"
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>שלח עדכון</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PreviousUpdatesModal({ visible, onClose, updates }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>עדכונים קודמים</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {updates.length === 0 ? (
              <Text style={styles.emptyText}>אין עדכונים קודמים עדיין</Text>
            ) : (
              updates.map((u, i) => (
                <View key={i} style={styles.updateCard}>
                  <Text style={styles.updateDate}>{u.date}</Text>
                  <Text style={styles.updateSummary}>{u.summary}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const TIPS = [
  { id: 1, title: 'טיפ תזונה: חלבון בכל ארוחה', desc: 'שלבי מקור חלבון בכל ארוחה לשמירה על מסת שריר ותחושת שובע.' },
  { id: 2, title: 'טיפ אימון: חימום חשוב!', desc: '5 דקות חימום לפני כל אימון מונעות פציעות ומשפרות ביצועים.' },
  { id: 3, title: 'טיפ הרגלים: שנה בת-קיימא', desc: 'שינויים קטנים ועקביים > דיאטות קיצוניות. כל יום קטן מוביל לתוצאה גדולה.' },
];

export default function CoachScreen() {
  const { user, coachingDaysLeft, previousUpdates, meetings } = useStore();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPrevUpdates, setShowPrevUpdates] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { from: 'ai', text: 'שלום! אני העוזר הדיגיטלי של שלהבת 💪 איך אפשר לעזור לך היום?' }
  ]);

  const openWhatsApp = () => {
    const phone = user.coachPhone || '0542213199';
    const message = 'שלום שלהבת, אני רוצה לשאול אותך משהו...';
    const url = `whatsapp://send?phone=972${phone.replace(/^0/, '')}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח WhatsApp. ודאי שהאפליקציה מותקנת.');
    });
  };

  const sendAIMessage = () => {
    if (!aiMessage.trim()) return;
    const userMsg = { from: 'user', text: aiMessage };
    const aiReply = {
      from: 'ai',
      text: 'תודה על שאלתך! 💪 שלהבת תענה לך בהקדם. בינתיים - זכרי שכל צעד קטן מוביל לתוצאה גדולה!'
    };
    setAiMessages([...aiMessages, userMsg, aiReply]);
    setAiMessage('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>דף מאמן</Text>

        {/* Communication Buttons */}
        <View style={styles.commRow}>
          <TouchableOpacity style={[styles.commBtn, styles.aiChatBtn]} onPress={() => setShowAIChat(true)}>
            <MaterialCommunityIcons name="robot" size={22} color={COLORS.white} />
            <Text style={styles.commBtnText}>צ׳אט AI 24/7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.commBtn, styles.waBtn]} onPress={openWhatsApp}>
            <FontAwesome5 name="whatsapp" size={22} color={COLORS.white} />
            <Text style={styles.commBtnText}>וואטסאפ{'\n'}פנה למאמן</Text>
          </TouchableOpacity>
        </View>

        {/* Coaching Progress */}
        <View style={styles.card}>
          <SectionHeader title="נותר לליווי" icon="time-outline" />
          <View style={styles.coachingProgress}>
            {coachingDaysLeft === -1 ? (
              <View style={styles.infiniteRow}>
                <Text style={styles.infiniteSymbol}>∞</Text>
                <Text style={styles.infiniteLabel}>ליווי ללא הגבלה</Text>
              </View>
            ) : (
              <>
                <Text style={styles.daysLeft}>{coachingDaysLeft}</Text>
                <Text style={styles.daysLabel}>ימים נותרו</Text>
              </>
            )}
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <SectionHeader title="טיפים ומדריכים" icon="bulb-outline" />
          {TIPS.map((tip) => (
            <TouchableOpacity key={tip.id} style={styles.tipItem} activeOpacity={0.7}>
              <View style={styles.tipContent}>
                <Text style={styles.tipDesc} numberOfLines={2}>{tip.desc}</Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
              </View>
              <View style={styles.tipIcon}>
                <Ionicons name="bulb" size={20} color={COLORS.warning} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meetings */}
        <View style={styles.card}>
          <SectionHeader title="פגישות" icon="calendar-outline" />
          {meetings.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-clear-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>אין פגישות קרובות</Text>
            </View>
          ) : (
            meetings.map((m, i) => (
              <View key={i} style={styles.meetingItem}>
                <View style={[styles.meetingStatus,
                  m.status === 'אושר' ? styles.statusApproved : styles.statusPending
                ]}>
                  <Text style={styles.meetingStatusText}>{m.status}</Text>
                </View>
                <View>
                  <Text style={styles.meetingDate}>{m.date}</Text>
                  {m.notes ? <Text style={styles.meetingNotes}>{m.notes}</Text> : null}
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowMeetingModal(true)}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>שליחת בקשה לפגישה</Text>
          </TouchableOpacity>
        </View>

        {/* Updates */}
        <View style={styles.card}>
          <SectionHeader title="עדכונים שבועיים" icon="newspaper-outline" />
          <TouchableOpacity style={styles.actionBtnFill} onPress={() => setShowUpdateModal(true)}>
            <Ionicons name="send" size={18} color={COLORS.white} />
            <Text style={styles.actionBtnFillText}>שלחי טופס עדכון למאמנת</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPrevUpdates(true)}>
            <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.actionBtnText}>ביקורת לעדכונים קודמים</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <MeetingRequestModal visible={showMeetingModal} onClose={() => setShowMeetingModal(false)} />
      <UpdateFormModal visible={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
      <PreviousUpdatesModal
        visible={showPrevUpdates}
        onClose={() => setShowPrevUpdates(false)}
        updates={previousUpdates}
      />

      {/* AI Chat Modal */}
      <Modal visible={showAIChat} transparent animationType="slide" onRequestClose={() => setShowAIChat(false)}>
        <KeyboardAvoidingView
          style={styles.chatModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setShowAIChat(false)} style={styles.chatClose}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.chatTitle}>צ׳אט AI 24/7</Text>
              <MaterialCommunityIcons name="robot" size={24} color={COLORS.primary} />
            </View>
            <ScrollView
              style={styles.chatMessages}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              {aiMessages.map((msg, i) => (
                <View key={i} style={[styles.chatBubble, msg.from === 'user' ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.chatBubbleText, msg.from === 'user' && styles.userBubbleText]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TouchableOpacity style={styles.sendBtn} onPress={sendAIMessage}>
                <Ionicons name="send" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                placeholder="כתבי הודעה..."
                placeholderTextColor={COLORS.textMuted}
                value={aiMessage}
                onChangeText={setAiMessage}
                textAlign="right"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  pageTitle: {
    color: COLORS.white, fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', marginTop: 16, marginBottom: 20,
  },
  commRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  commBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  aiChatBtn: { backgroundColor: '#6A1B9A' },
  waBtn: { backgroundColor: '#1B5E20' },
  commBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 8, marginBottom: 14,
  },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  coachingProgress: { alignItems: 'center', marginBottom: 12 },
  infiniteRow: { alignItems: 'center', gap: 4 },
  infiniteSymbol: { color: COLORS.primary, fontSize: 52, fontWeight: 'bold', lineHeight: 60 },
  infiniteLabel: { color: COLORS.textSecondary, fontSize: 14 },
  daysLeft: { color: COLORS.primary, fontSize: 52, fontWeight: 'bold' },
  daysLabel: { color: COLORS.textSecondary, fontSize: 14 },
  progressBg: { height: 6, backgroundColor: COLORS.cardLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  tipItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  tipIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.warning + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  tipDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  meetingItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, justifyContent: 'flex-end',
  },
  meetingDate: { color: COLORS.white, fontSize: 14, textAlign: 'right' },
  meetingNotes: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right' },
  meetingStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusApproved: { backgroundColor: COLORS.success + '33' },
  statusPending: { backgroundColor: COLORS.warning + '33' },
  meetingStatusText: { fontSize: 11, fontWeight: '600', color: COLORS.white },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8,
  },
  actionBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  actionBtnFill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, marginBottom: 8,
  },
  actionBtnFillText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: COLORS.border, flexShrink: 1, maxHeight: '88%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  modalSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 14, textAlign: 'right',
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  inputLarge: { height: 130, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  submitBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  closeBtn: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  closeBtnText: { color: COLORS.white, fontSize: 15 },
  updateCard: {
    backgroundColor: COLORS.cardLight, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  updateDate: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  updateSummary: { color: COLORS.white, fontSize: 14, textAlign: 'right', lineHeight: 20 },
  chatModal: { flex: 1, backgroundColor: COLORS.background },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chatClose: { padding: 4 },
  chatTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  chatMessages: { flex: 1 },
  chatBubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16,
    backgroundColor: COLORS.card, alignSelf: 'flex-start',
  },
  aiBubble: { borderBottomLeftRadius: 4 },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4,
  },
  chatBubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  userBubbleText: { textAlign: 'right' },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 24, paddingHorizontal: 16,
    paddingVertical: 10, color: COLORS.white, fontSize: 14, textAlign: 'right',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
