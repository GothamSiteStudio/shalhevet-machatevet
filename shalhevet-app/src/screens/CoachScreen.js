import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import DismissKeyboardView from '../components/ui/DismissKeyboardView';
import { COLORS } from '../theme/colors';
import { usersAPI } from '../services/api';
import useStore from '../store/useStore';
import { KEYBOARD_AVOIDING_BEHAVIOR, KEYBOARD_DISMISS_MODE } from '../utils/keyboard';

function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {icon && <Ionicons name={icon} size={18} color={COLORS.primary} />}
    </View>
  );
}

function MeetingRequestModal({ visible, onClose, onSubmit, saving }) {
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!date) {
      Alert.alert('שגיאה', 'נא להזין תאריך מבוקש');
      return;
    }
    const success = await onSubmit(date, notes);
    if (success) {
      onClose();
      Alert.alert('✅ נשלח!', 'בקשת הפגישה נשלחה לשלהבת. היא תאשר בהקדם!');
      setDate('');
      setNotes('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>בקשת פגישה</Text>
            <Text style={styles.modalSub}>שלח בקשה לפגישה עם שלהבת</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
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
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.submitBtnText}>{saving ? 'שולח...' : 'שלח בקשה'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

function UpdateFormModal({ visible, onClose, onSubmit, saving }) {
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('שגיאה', 'נא לכתוב עדכון');
      return;
    }
    const success = await onSubmit(text.trim());
    if (success) {
      onClose();
      Alert.alert('✅ נשלח!', 'העדכון נשלח לשלהבת בהצלחה!');
      setText('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>שלחי עדכון שבועי</Text>
            <Text style={styles.modalSub}>ספרי לשלהבת איך הולך השבוע</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
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
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.submitBtnText}>{saving ? 'שולח...' : 'שלח עדכון'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

function normalizeUpdate(update) {
  return {
    id: update?.id || `update-${update?.date || Date.now()}`,
    date:
      update?.date || update?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    summary: update?.summary || update?.text || '',
  };
}

function normalizeMeeting(meeting) {
  return {
    id: meeting?.id || `meeting-${meeting?.requestedDate || Date.now()}`,
    date: meeting?.date || meeting?.requestedDate || '',
    notes: meeting?.notes || '',
    status: meeting?.status || 'ממתין לאישור',
  };
}

function getCurrentWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

function normalizeHabit(habit) {
  return {
    id: habit?.id || `habit-${Date.now()}`,
    title: habit?.title || 'הרגל',
    frequency: habit?.frequency || 'daily',
    targetCount: Number(habit?.targetCount) || 1,
    notes: habit?.notes || '',
    isActive: habit?.isActive !== false,
    completed: Boolean(habit?.completed),
    completedAt: habit?.completedAt || null,
  };
}

function normalizeCheckInEntry(entry) {
  if (!entry) return null;

  return {
    id: entry.id || `check-in-${entry.weekKey || Date.now()}`,
    weekKey: entry.weekKey || '',
    note: entry.note || '',
    submittedAt: entry.submittedAt || entry.createdAt || '',
    answers: Array.isArray(entry.answers) ? entry.answers : [],
  };
}

function createCheckInDraft(template, entry) {
  const answersByQuestionId = new Map(
    Array.isArray(entry?.answers)
      ? entry.answers.map(answer => [String(answer?.questionId || ''), answer])
      : []
  );

  return {
    answers: Array.isArray(template?.questions)
      ? template.questions.map(question => ({
          questionId: question.id,
          type: question.type,
          value:
            answersByQuestionId.get(question.id)?.value ??
            (question.type === 'yesNo' ? null : question.type === 'scale' ? null : ''),
        }))
      : [],
    note: entry?.note || '',
  };
}

function CheckInModal({ visible, onClose, template, entry, saving, onSubmit }) {
  const [draft, setDraft] = useState(() => createCheckInDraft(template, entry));

  useEffect(() => {
    if (visible) {
      setDraft(createCheckInDraft(template, entry));
    }
  }, [visible, template, entry]);

  const updateAnswerValue = (questionId, value) => {
    setDraft(current => ({
      ...current,
      answers: current.answers.map(answer =>
        answer.questionId === questionId ? { ...answer, value } : answer
      ),
    }));
  };

  const handleSubmit = async () => {
    const success = await onSubmit(draft.answers, draft.note);
    if (success) {
      onClose();
      Alert.alert('✅ נשלח!', 'הצ׳ק-אין השבועי נשלח בהצלחה לשלהבת.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{template?.title || 'צ׳ק-אין שבועי'}</Text>
            <Text style={styles.modalSub}>{template?.intro || 'מלאי את הטופס ושלחי עדכון מסודר למאמנת.'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {(template?.questions || []).map(question => {
                const answer = draft.answers.find(item => item.questionId === question.id);

                return (
                  <View key={question.id} style={styles.checkInQuestionCard}>
                    <Text style={styles.checkInQuestionLabel}>{question.label}</Text>
                    {question.helperText ? (
                      <Text style={styles.checkInQuestionHelp}>{question.helperText}</Text>
                    ) : null}

                    {question.type === 'yesNo' ? (
                      <View style={styles.inlineChoiceRow}>
                        {[
                          { value: false, label: 'לא' },
                          { value: true, label: 'כן' },
                        ].map(option => (
                          <TouchableOpacity
                            key={option.label}
                            style={[
                              styles.inlineChoiceChip,
                              answer?.value === option.value && styles.inlineChoiceChipActive,
                            ]}
                            onPress={() => updateAnswerValue(question.id, option.value)}
                          >
                            <Text
                              style={[
                                styles.inlineChoiceChipText,
                                answer?.value === option.value && styles.inlineChoiceChipTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}

                    {question.type === 'scale' ? (
                      <View style={styles.inlineChoiceWrap}>
                        {[1, 2, 3, 4, 5].map(value => (
                          <TouchableOpacity
                            key={value}
                            style={[
                              styles.inlineChoiceChip,
                              answer?.value === value && styles.inlineChoiceChipActive,
                            ]}
                            onPress={() => updateAnswerValue(question.id, value)}
                          >
                            <Text
                              style={[
                                styles.inlineChoiceChipText,
                                answer?.value === value && styles.inlineChoiceChipTextActive,
                              ]}
                            >
                              {value}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}

                    {question.type === 'number' ? (
                      <TextInput
                        style={styles.input}
                        value={
                          answer?.value === null || answer?.value === undefined
                            ? ''
                            : String(answer.value)
                        }
                        onChangeText={value => updateAnswerValue(question.id, value)}
                        placeholder={question.placeholder || 'כתבי מספר'}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        textAlign="right"
                      />
                    ) : null}

                    {question.type === 'shortText' || question.type === 'longText' ? (
                      <TextInput
                        style={[styles.input, question.type === 'longText' && styles.inputLarge]}
                        value={answer?.value == null ? '' : String(answer.value)}
                        onChangeText={value => updateAnswerValue(question.id, value)}
                        placeholder={question.placeholder || 'כתבי תשובה'}
                        placeholderTextColor={COLORS.textMuted}
                        multiline={question.type === 'longText'}
                        numberOfLines={question.type === 'longText' ? 4 : 1}
                        textAlign="right"
                        textAlignVertical={question.type === 'longText' ? 'top' : 'center'}
                      />
                    ) : null}
                  </View>
                );
              })}

              <Text style={styles.inputLabel}>הערה כללית למאמנת (אופציונלי)</Text>
              <TextInput
                style={[styles.input, styles.inputLarge]}
                placeholder="משהו נוסף שחשוב לך לעדכן"
                placeholderTextColor={COLORS.textMuted}
                value={draft.note}
                onChangeText={value => setDraft(current => ({ ...current, note: value }))}
                multiline
                numberOfLines={4}
                textAlign="right"
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.submitBtnText}>{saving ? 'שולח...' : 'שלח צ׳ק-אין'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
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
  {
    id: 1,
    title: 'טיפ תזונה: חלבון בכל ארוחה',
    desc: 'שלבי מקור חלבון בכל ארוחה לשמירה על מסת שריר ותחושת שובע.',
  },
  {
    id: 2,
    title: 'טיפ אימון: חימום חשוב!',
    desc: '5 דקות חימום לפני כל אימון מונעות פציעות ומשפרות ביצועים.',
  },
  {
    id: 3,
    title: 'טיפ הרגלים: שנה בת-קיימא',
    desc: 'שינויים קטנים ועקביים > דיאטות קיצוניות. כל יום קטן מוביל לתוצאה גדולה.',
  },
];

export default function CoachScreen() {
  const { user, coachingDaysLeft } = useStore();
  const todayDateKey = new Date().toISOString().split('T')[0];
  const currentWeekKey = getCurrentWeekKey();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPrevUpdates, setShowPrevUpdates] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [habitUpdatingId, setHabitUpdatingId] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [previousUpdates, setPreviousUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [habits, setHabits] = useState([]);
  const [checkInTemplate, setCheckInTemplate] = useState({ title: '', intro: '', questions: [] });
  const [currentCheckInEntry, setCurrentCheckInEntry] = useState(null);
  const [latestCheckInEntry, setLatestCheckInEntry] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    { from: 'ai', text: 'שלום! אני העוזר הדיגיטלי של שלהבת 💪 איך אפשר לעזור לך היום?' },
  ]);

  const loadCoachData = useCallback(async () => {
    const [updatesResult, meetingsResult, habitsResult, checkInResult] = await Promise.allSettled([
      usersAPI.getUpdates(),
      usersAPI.getMeetings(),
      usersAPI.getHabits(todayDateKey),
      usersAPI.getCheckIn(currentWeekKey),
    ]);

    if (updatesResult.status === 'fulfilled') {
      setPreviousUpdates((updatesResult.value.updates || []).map(normalizeUpdate));
    }

    if (meetingsResult.status === 'fulfilled') {
      setMeetings((meetingsResult.value.meetings || []).map(normalizeMeeting));
    }

    if (habitsResult.status === 'fulfilled') {
      setHabits((habitsResult.value.habits || []).map(normalizeHabit));
    } else {
      setHabits([]);
    }

    if (checkInResult.status === 'fulfilled') {
      setCheckInTemplate(checkInResult.value.template || { title: '', intro: '', questions: [] });
      setCurrentCheckInEntry(normalizeCheckInEntry(checkInResult.value.entry));
      setLatestCheckInEntry(normalizeCheckInEntry(checkInResult.value.latestEntry));
    } else {
      setCheckInTemplate({ title: '', intro: '', questions: [] });
      setCurrentCheckInEntry(null);
      setLatestCheckInEntry(null);
    }

    if (updatesResult.status === 'rejected') {
      setSyncNotice(updatesResult.reason?.message || 'לא ניתן לטעון את העדכונים כרגע');
      return;
    }

    if (meetingsResult.status === 'rejected') {
      setSyncNotice(meetingsResult.reason?.message || 'לא ניתן לטעון את הפגישות כרגע');
      return;
    }

    setSyncNotice('');
  }, [currentWeekKey, todayDateKey]);

  useFocusEffect(
    useCallback(() => {
      loadCoachData();
    }, [loadCoachData])
  );

  const handleMeetingRequest = async (date, notes) => {
    setMeetingSaving(true);
    try {
      const result = await usersAPI.requestMeeting(date, notes);
      const nextMeeting = normalizeMeeting(result.meeting || { requestedDate: date, notes });
      setMeetings(current => [nextMeeting, ...current.filter(item => item.id !== nextMeeting.id)]);
      setSyncNotice('');
      return true;
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשלוח בקשת פגישה כרגע');
      return false;
    } finally {
      setMeetingSaving(false);
    }
  };

  const handleSendUpdate = async text => {
    setUpdateSaving(true);
    try {
      const result = await usersAPI.sendUpdate(text);
      const nextUpdate = normalizeUpdate(result.update || { text });
      setPreviousUpdates(current => [
        nextUpdate,
        ...current.filter(item => item.id !== nextUpdate.id),
      ]);
      setSyncNotice('');
      return true;
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשלוח את העדכון כרגע');
      return false;
    } finally {
      setUpdateSaving(false);
    }
  };

  const handleToggleHabit = async habit => {
    setHabitUpdatingId(habit.id);
    try {
      const result = await usersAPI.updateHabit(habit.id, todayDateKey, !habit.completed);
      setHabits((result.habits || []).map(normalizeHabit));
      setSyncNotice('');
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לעדכן את ההרגל כרגע');
    } finally {
      setHabitUpdatingId('');
    }
  };

  const handleSubmitCheckIn = async (answers, note) => {
    setCheckInSaving(true);
    try {
      const result = await usersAPI.submitCheckIn(currentWeekKey, { answers, note });
      const nextEntry = normalizeCheckInEntry(result.entry);

      setCurrentCheckInEntry(nextEntry);
      setLatestCheckInEntry(nextEntry);
      setSyncNotice('');

      if (result.update) {
        const nextUpdate = normalizeUpdate(result.update);
        setPreviousUpdates(current => [nextUpdate, ...current.filter(item => item.id !== nextUpdate.id)]);
      }

      return true;
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'לא ניתן לשלוח את הצ׳ק-אין כרגע');
      return false;
    } finally {
      setCheckInSaving(false);
    }
  };

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
      text: 'תודה על שאלתך! 💪 שלהבת תענה לך בהקדם. בינתיים - זכרי שכל צעד קטן מוביל לתוצאה גדולה!',
    };
    setAiMessages([...aiMessages, userMsg, aiReply]);
    setAiMessage('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>דף מאמן</Text>

        {syncNotice ? (
          <View style={styles.noticeCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
            <Text style={styles.noticeText}>{syncNotice}</Text>
          </View>
        ) : null}

        {/* Communication Buttons */}
        <View style={styles.commRow}>
          <TouchableOpacity
            style={[styles.commBtn, styles.aiChatBtn]}
            onPress={() => setShowAIChat(true)}
          >
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
          {TIPS.map(tip => (
            <TouchableOpacity key={tip.id} style={styles.tipItem} activeOpacity={0.7}>
              <View style={styles.tipContent}>
                <Text style={styles.tipDesc} numberOfLines={2}>
                  {tip.desc}
                </Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
              </View>
              <View style={styles.tipIcon}>
                <Ionicons name="bulb" size={20} color={COLORS.warning} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <SectionHeader title="המשימות שלי" icon="checkmark-done-outline" />
          {habits.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="checkbox-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>שלהבת עדיין לא הגדירה לך הרגלים למעקב</Text>
            </View>
          ) : (
            habits.map(habit => (
              <TouchableOpacity
                key={habit.id}
                style={[styles.habitRow, habit.completed && styles.habitRowCompleted]}
                onPress={() => handleToggleHabit(habit)}
                activeOpacity={0.8}
              >
                <View style={styles.habitMeta}>
                  <Text style={styles.habitTitle}>{habit.title}</Text>
                  <Text style={styles.habitSubtitle}>
                    {habit.frequency === 'daily' ? 'יומי' : 'שבועי'} · יעד {habit.targetCount}
                  </Text>
                  {habit.notes ? <Text style={styles.habitNotes}>{habit.notes}</Text> : null}
                </View>
                <View style={styles.habitAction}>
                  {habitUpdatingId === habit.id ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons
                      name={habit.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={habit.completed ? COLORS.success : COLORS.textMuted}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <SectionHeader title="צ׳ק-אין שבועי" icon="clipboard-outline" />
          {Array.isArray(checkInTemplate.questions) && checkInTemplate.questions.length > 0 ? (
            <>
              <View style={styles.checkInSummaryBox}>
                <View>
                  <Text style={styles.checkInSummaryTitle}>
                    {checkInTemplate.title || 'צ׳ק-אין שבועי'}
                  </Text>
                  <Text style={styles.checkInSummaryMeta}>
                    {checkInTemplate.questions.length} שאלות · שבוע {currentWeekKey}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkInStatusBadge,
                    currentCheckInEntry ? styles.checkInStatusBadgeDone : styles.checkInStatusBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.checkInStatusBadgeText,
                      currentCheckInEntry
                        ? styles.checkInStatusBadgeTextDone
                        : styles.checkInStatusBadgeTextPending,
                    ]}
                  >
                    {currentCheckInEntry ? 'נשלח השבוע' : 'ממתין למילוי'}
                  </Text>
                </View>
              </View>

              {latestCheckInEntry?.submittedAt ? (
                <Text style={styles.checkInLastSentText}>
                  צ׳ק-אין אחרון נשלח בתאריך {String(latestCheckInEntry.submittedAt).slice(0, 10)}
                </Text>
              ) : null}

              <TouchableOpacity style={styles.actionBtnFill} onPress={() => setShowCheckInModal(true)}>
                <Ionicons name="clipboard-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnFillText}>
                  {currentCheckInEntry ? 'עריכת הצ׳ק-אין השבועי' : 'מילוי צ׳ק-אין שבועי'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="clipboard-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>שלהבת עדיין לא הגדירה עבורך טופס צ׳ק-אין.</Text>
            </View>
          )}
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
                <View
                  style={[
                    styles.meetingStatus,
                    m.status === 'אושר' ? styles.statusApproved : styles.statusPending,
                  ]}
                >
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
      <MeetingRequestModal
        visible={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSubmit={handleMeetingRequest}
        saving={meetingSaving}
      />
      <UpdateFormModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSubmit={handleSendUpdate}
        saving={updateSaving}
      />
      <PreviousUpdatesModal
        visible={showPrevUpdates}
        onClose={() => setShowPrevUpdates(false)}
        updates={previousUpdates}
      />
      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        template={checkInTemplate}
        entry={currentCheckInEntry}
        saving={checkInSaving}
        onSubmit={handleSubmitCheckIn}
      />

      {/* AI Chat Modal */}
      <Modal
        visible={showAIChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIChat(false)}
      >
        <DismissKeyboardView style={{ flex: 1 }}>
          <KeyboardAvoidingView style={styles.chatModal} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
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
              keyboardDismissMode={KEYBOARD_DISMISS_MODE}
            >
              {aiMessages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    msg.from === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[styles.chatBubbleText, msg.from === 'user' && styles.userBubbleText]}
                  >
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
                onSubmitEditing={sendAIMessage}
                returnKeyType="send"
                blurOnSubmit={false}
                textAlign="right"
              />
            </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </DismissKeyboardView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  pageTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  noticeText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  commRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  commBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiChatBtn: { backgroundColor: '#6A1B9A' },
  waBtn: { backgroundColor: '#1B5E20' },
  commBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkInLastSentText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'right',
  },
  checkInQuestionCard: {
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  checkInQuestionHelp: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'right',
  },
  checkInQuestionLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  checkInStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkInStatusBadgeDone: { backgroundColor: `${COLORS.success}22` },
  checkInStatusBadgePending: { backgroundColor: `${COLORS.warning}22` },
  checkInStatusBadgeText: { fontSize: 11, fontWeight: '700' },
  checkInStatusBadgeTextDone: { color: COLORS.success },
  checkInStatusBadgeTextPending: { color: COLORS.warning },
  checkInSummaryBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkInSummaryMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  checkInSummaryTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warning + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  tipDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  habitAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
  },
  habitMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  habitNotes: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  habitRow: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  habitRowCompleted: {
    opacity: 0.9,
  },
  habitSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'right',
  },
  habitTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  inlineChoiceChip: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inlineChoiceChipActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: COLORS.primary,
  },
  inlineChoiceChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineChoiceChipTextActive: {
    color: COLORS.primary,
  },
  inlineChoiceRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  inlineChoiceWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  meetingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'flex-end',
  },
  meetingDate: { color: COLORS.white, fontSize: 14, textAlign: 'right' },
  meetingNotes: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right' },
  meetingStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusApproved: { backgroundColor: COLORS.success + '33' },
  statusPending: { backgroundColor: COLORS.warning + '33' },
  meetingStatusText: { fontSize: 11, fontWeight: '600', color: COLORS.white },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  actionBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  actionBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  actionBtnFillText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 1,
    maxHeight: '88%',
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
  modalSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 14,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    textAlign: 'right',
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  inputLarge: { height: 130, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  closeBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: { color: COLORS.white, fontSize: 15 },
  updateCard: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateDate: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  updateSummary: { color: COLORS.white, fontSize: 14, textAlign: 'right', lineHeight: 20 },
  chatModal: { flex: 1, backgroundColor: COLORS.background },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatClose: { padding: 4 },
  chatTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  chatMessages: { flex: 1 },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignSelf: 'flex-start',
  },
  aiBubble: { borderBottomLeftRadius: 4 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  userBubbleText: { textAlign: 'right' },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'right',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
