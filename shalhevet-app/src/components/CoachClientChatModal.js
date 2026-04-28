import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { coachAPI } from '../services/api';
import { announce } from '../utils/accessibility';

const QUICK_TEMPLATES = [
  { id: 'check_in', emoji: '👋', text: 'מה שלומך היום? איך התחושה הכללית עם התוכנית?' },
  { id: 'praise', emoji: '🔥', text: 'ראיתי את היומן שלך — שאפו ענק! ככה ממשיכים.' },
  { id: 'remind', emoji: '⏰', text: 'תזכורת קלה: לא ראיתי שעדכנת משקל השבוע. תוכלי לעדכן?' },
  { id: 'support', emoji: '💪', text: 'יום קצת קשה? זה נורמלי לחלוטין. אני כאן בשבילך.' },
];

function formatTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

export default function CoachClientChatModal({ visible, client, onClose, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const data = await coachAPI.getClientMessages(client.id);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לטעון את השיחה');
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    if (visible) {
      setText('');
      setShowTemplates(false);
      load();
    }
  }, [visible, load]);

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !client?.id) return;
    setSending(true);
    try {
      const res = await coachAPI.sendMessage(client.id, trimmed);
      if (res?.data) {
        setMessages(prev => [...prev, res.data]);
      }
      setText('');
      announce('ההודעה נשלחה');
      onMessageSent?.(client.id);
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'ההודעה לא נשלחה');
    } finally {
      setSending(false);
    }
  };

  const useTemplate = template => {
    const personalized = template.text.replace(/\{\{firstName\}\}/g, client?.name?.split(' ')[0] || '');
    setText(personalized);
    setShowTemplates(false);
  };

  const renderMessage = ({ item }) => {
    const fromCoach = item.fromRole === 'coach' || item.from_role === 'coach';
    return (
      <View style={[styles.bubbleRow, fromCoach ? styles.rowCoach : styles.rowClient]}>
        <View
          style={[styles.bubble, fromCoach ? styles.bubbleCoach : styles.bubbleClient]}
          accessibilityLabel={`${fromCoach ? 'הודעה ממך' : 'הודעה מהלקוחה'}: ${item.text}`}
        >
          <Text style={styles.bubbleText}>{item.text}</Text>
          <Text style={styles.bubbleTime}>{formatTime(item.createdAt || item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="סגור צ'אט"
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerName} accessibilityRole="header">
                {client?.name || 'לקוחה'}
              </Text>
              <Text style={styles.headerSub}>שיחה ישירה</Text>
            </View>
            <View style={styles.closeBtn} />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={42} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>זאת השיחה הראשונה שלכן</Text>
              <Text style={styles.emptyText}>
                שלחי הודעה אישית או הסתעפי לתבנית מהירה ↓
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, idx) => String(item.id || item.created_at || idx)}
              contentContainerStyle={styles.listContent}
            />
          )}

          {showTemplates ? (
            <View style={styles.templatesBox}>
              {QUICK_TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.templateRow}
                  onPress={() => useTemplate(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`תבנית: ${t.text}`}
                >
                  <Text style={styles.templateEmoji}>{t.emoji}</Text>
                  <Text style={styles.templateText} numberOfLines={2}>
                    {t.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.composer}>
            <TouchableOpacity
              style={styles.composerIcon}
              onPress={() => setShowTemplates(v => !v)}
              accessibilityRole="button"
              accessibilityLabel="פתח תבניות הודעה מהירות"
            >
              <Ionicons
                name={showTemplates ? 'sparkles' : 'sparkles-outline'}
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="כתבי הודעה..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlign="right"
              accessibilityLabel="שדה כתיבת הודעה"
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="שלח הודעה"
              accessibilityState={{ disabled: !text.trim() || sending }}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background,
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  listContent: { padding: 16, gap: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 6 },
  rowCoach: { justifyContent: 'flex-end' },
  rowClient: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleCoach: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleClient: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  bubbleTime: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 4, textAlign: 'left' },
  templatesBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingVertical: 8,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  templateEmoji: { fontSize: 22 },
  templateText: { flex: 1, color: COLORS.text, fontSize: 13, textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  composerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.inputBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
