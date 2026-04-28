/**
 * CoachDashboardScreen.js - לוח הבקרה של שלהבת המאמנת
 * ========================================================
 * רק שלהבת רואה את המסך הזה (role === 'coach')
 *
 * מה יש כאן:
 * 1. סטטיסטיקות כלליות
 * 2. רשימת כל הלקוחות
 * 3. עדכונים חדשים
 * 4. בקשות פגישות
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DismissKeyboardView from '../components/ui/DismissKeyboardView';
import { COLORS } from '../theme/colors';
import { coachAPI, tokenStorage } from '../services/api';
import { CATALOG_MEAL_SOURCE, mergeRecipeCatalogWithCoachMeals } from '../data/recipeCatalog';
import CoachClientPlansModal from '../components/CoachClientPlansModal';
import CoachClientChatModal from '../components/CoachClientChatModal';
import MiniSparkline from '../components/MiniSparkline';
import useStore from '../store/useStore';
import { KEYBOARD_AVOIDING_BEHAVIOR, KEYBOARD_DISMISS_MODE } from '../utils/keyboard';

// ─── קומפוננטת כרטיס סטטיסטיקה ────────────────────────────────────────────
function StatCard({ value, label, icon, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getAutomationAccent(level) {
  switch (level) {
    case 'urgent':
      return { backgroundColor: '#B71C1C33', color: '#EF5350', icon: 'alert-circle' };
    case 'follow_up':
      return { backgroundColor: '#E6510033', color: '#FFA726', icon: 'time-outline' };
    case 'monitor':
      return { backgroundColor: '#1565C033', color: COLORS.info, icon: 'eye-outline' };
    default:
      return { backgroundColor: '#2E7D3233', color: COLORS.success, icon: 'checkmark-circle-outline' };
  }
}

// ─── קומפוננטת כרטיס לקוחה ──────────────────────────────────────────────────
function ClientCard({ client, onPress, onChat, onReminder, sendingReminder }) {
  const automationStatus = client.automationStatus || {};
  const automationAccent = getAutomationAccent(automationStatus.level);
  const automationBadgeText = automationStatus.daysSinceClientActivity != null
    ? `לא מגיבה ${automationStatus.daysSinceClientActivity} ימים`
    : 'לא מגיבה';
  const initials = client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2);

  const accessibilityLabel = [
    client.name,
    client.isActive ? 'לקוחה פעילה' : 'לקוחה לא פעילה',
    client.requiresAttention ? 'דורשת טיפול' : null,
    client.goal ? `מטרה ${client.goal}` : null,
    client.coachStatus ? `סטטוס ליווי ${client.coachStatus}` : null,
    Array.isArray(client.coachTags) && client.coachTags.length
      ? `תגיות ${client.coachTags.join(', ')}`
      : null,
    client.weight ? `משקל ${client.weight} קילוגרם` : null,
    client.pendingMeetingsCount ? `${client.pendingMeetingsCount} פגישות ממתינות` : null,
    client.unreadUpdatesCount ? `${client.unreadUpdatesCount} עדכונים חדשים` : null,
    client.isNewClient ? 'לקוחה חדשה' : null,
    automationStatus.summaryText ? `מעקב אוטומטי ${automationStatus.summaryText}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={[styles.clientCard, client.requiresAttention && styles.clientCardPriority]}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="לחצי לפתיחת פרטי הלקוחה, עדכון יעדים ותוכניות"
    >
      <View style={styles.clientInfo}>
        <View>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
          {client.goal && <Text style={styles.clientGoal}>🎯 {client.goal}</Text>}
          {client.coachStatus ? (
            <View style={[styles.clientBadge, styles.clientCoachStatusBadge]}>
              <Text style={[styles.clientBadgeText, styles.clientCoachStatusText]}>
                {client.coachStatus}
              </Text>
            </View>
          ) : null}
          {Array.isArray(client.coachTags) && client.coachTags.length ? (
            <View style={styles.clientTagsRow}>
              {client.coachTags.slice(0, 3).map(tag => (
                <View key={tag} style={[styles.clientBadge, styles.clientTagBadge]}>
                  <Text style={[styles.clientBadgeText, styles.clientTagBadgeText]}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.clientActionHint}>לחצי לעריכת חשבון, יעדים, תזונה ויומן אכילה</Text>
          {automationStatus.isNonResponsive ? (
            <View style={styles.clientAutomationRow}>
              <Ionicons
                name={automationAccent.icon}
                size={14}
                color={automationAccent.color}
                style={styles.clientAutomationIcon}
              />
              <Text style={[styles.clientAutomationText, { color: automationAccent.color }]}>
                {automationStatus.summaryText}
              </Text>
            </View>
          ) : null}
          {(client.pendingMeetingsCount
            || client.unreadUpdatesCount
            || client.isNewClient
            || automationStatus.isNonResponsive
            || automationStatus.reminder?.shouldSendNow) ? (
            <View style={styles.clientBadgesRow}>
              {client.pendingMeetingsCount ? (
                <View style={[styles.clientBadge, styles.clientBadgePending]}>
                  <Text style={[styles.clientBadgeText, styles.clientBadgePendingText]}>
                    {client.pendingMeetingsCount} פגישות ממתינות
                  </Text>
                </View>
              ) : null}
              {client.unreadUpdatesCount ? (
                <View style={[styles.clientBadge, styles.clientBadgeUnread]}>
                  <Text style={[styles.clientBadgeText, styles.clientBadgeUnreadText]}>
                    {client.unreadUpdatesCount} עדכונים חדשים
                  </Text>
                </View>
              ) : null}
              {client.isNewClient ? (
                <View style={[styles.clientBadge, styles.clientBadgeNew]}>
                  <Text style={[styles.clientBadgeText, styles.clientBadgeNewText]}>לקוחה חדשה</Text>
                </View>
              ) : null}
              {automationStatus.isNonResponsive ? (
                <View
                  style={[
                    styles.clientBadge,
                    styles.clientBadgeAutomation,
                    { backgroundColor: automationAccent.backgroundColor },
                  ]}
                >
                  <Text style={[styles.clientBadgeText, { color: automationAccent.color }]}>
                    {automationBadgeText}
                  </Text>
                </View>
              ) : null}
              {automationStatus.reminder?.shouldSendNow ? (
                <View style={[styles.clientBadge, styles.clientBadgeReminder]}>
                  <Text style={[styles.clientBadgeText, styles.clientBadgeReminderText]}>
                    תזכורת מוכנה
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.clientMeta}>
          {client.weight && <Text style={styles.clientWeight}>{`${client.weight} ק״ג`}</Text>}
          <View
            style={[
              styles.clientStatus,
              { backgroundColor: client.isActive ? '#2E7D3233' : '#B71C1C33' },
            ]}
          >
            <Text
              style={[styles.clientStatusText, { color: client.isActive ? '#4CAF50' : '#F44336' }]}
            >
              {client.isActive ? 'פעילה' : 'לא פעילה'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>{initials}</Text>
      </View>

      {Array.isArray(client.weightHistory) && client.weightHistory.length >= 2 ? (
        <View style={styles.clientSparklineRow}>
          <Ionicons name="trending-down-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.clientSparklineLabel}>מגמת משקל</Text>
          <MiniSparkline
            values={client.weightHistory.slice(-10).map(w => Number(w?.weight)).filter(Boolean)}
            width={90}
            height={20}
          />
        </View>
      ) : null}

      <View style={styles.clientQuickActionsRow}>
        <TouchableOpacity
          style={styles.clientQuickAction}
          onPress={e => {
            e?.stopPropagation?.();
            onChat?.(client);
          }}
          accessibilityRole="button"
          accessibilityLabel={`שלחי הודעה ל${client.name}`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
          <Text style={styles.clientQuickActionText}>הודעה</Text>
        </TouchableOpacity>

        {client.automationStatus?.reminder?.shouldSendNow ? (
          <TouchableOpacity
            style={[styles.clientQuickAction, styles.clientQuickActionAccent]}
            disabled={sendingReminder}
            onPress={e => {
              e?.stopPropagation?.();
              onReminder?.(client);
            }}
            accessibilityRole="button"
            accessibilityLabel={`שלחי תזכורת ל${client.name}`}
            accessibilityState={{ disabled: !!sendingReminder }}
          >
            {sendingReminder ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
                <Text style={styles.clientQuickActionText}>תזכורת</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.clientQuickAction}
          onPress={e => {
            e?.stopPropagation?.();
            onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={`פתחי תוכניות של ${client.name}`}
        >
          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
          <Text style={styles.clientQuickActionText}>תוכניות</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── מודל הוספת לקוחה ────────────────────────────────────────────────────────
function AddClientModal({ visible, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setFormMessage(null);
  }, []);

  const showFormMessage = (text, type = 'error') => {
    const nextMessage = text ? { text, type } : null;
    setFormMessage(nextMessage);

    if (text) {
      AccessibilityInfo.announceForAccessibility(text);
    }

    return false;
  };

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [resetForm, visible]);

  const handleAdd = async () => {
    if (!name.trim()) return showFormMessage('נא להזין שם מלא');
    if (!email.trim() || !email.includes('@')) return showFormMessage('נא להזין אימייל תקין');
    if (!password || password.length < 6) return showFormMessage('הסיסמה חייבת להיות לפחות 6 תווים');

    setLoading(true);
    setFormMessage(null);

    try {
      await coachAPI.addClient({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
      });
      Alert.alert('✅ נוסף!', `${name.trim()} נוספה למערכת`);
      resetForm();
      onAdded();
      onClose();
    } catch (err) {
      showFormMessage(err.message || 'לא ניתן להוסיף לקוחה כרגע');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle} accessibilityRole="header">הוספת לקוחה חדשה</Text>
          <Text style={styles.modalSub}>המאמנת פותחת חשבון ישירות</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {formMessage ? (
                <View
                  style={[
                    styles.formMessage,
                    formMessage.type === 'success' ? styles.formMessageSuccess : styles.formMessageError,
                  ]}
                  accessible={true}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons
                    name={formMessage.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={18}
                    color={formMessage.type === 'success' ? COLORS.success : COLORS.danger}
                    style={styles.formMessageIcon}
                    accessible={false}
                  />
                  <Text
                    style={[
                      styles.formMessageText,
                      formMessage.type === 'success' ? styles.formMessageTextSuccess : styles.formMessageTextError,
                    ]}
                  >
                    {formMessage.text}
                  </Text>
                </View>
              ) : null}

              {[
                {
                  label: 'שם מלא *',
                  value: name,
                  setter: setName,
                  placeholder: 'שם פרטי ומשפחה',
                  autoComplete: 'name',
                  textContentType: 'name',
                },
                {
                  label: 'אימייל *',
                  value: email,
                  setter: setEmail,
                  placeholder: 'email@gmail.com',
                  keyboard: 'email-address',
                  autoCapitalize: 'none',
                  autoComplete: 'email',
                  textContentType: 'emailAddress',
                },
                {
                  label: 'סיסמה זמנית *',
                  value: password,
                  setter: setPassword,
                  placeholder: 'לפחות 6 תווים',
                  secure: true,
                  autoCapitalize: 'none',
                  autoComplete: 'new-password',
                  textContentType: 'newPassword',
                },
                {
                  label: 'טלפון',
                  value: phone,
                  setter: setPhone,
                  placeholder: '050-0000000',
                  keyboard: 'phone-pad',
                  autoComplete: 'tel',
                  textContentType: 'telephoneNumber',
                },
              ].map(field => (
                <View key={field.label} style={{ marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={value => {
                      if (formMessage) {
                        setFormMessage(null);
                      }
                      field.setter(value);
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType={field.keyboard || 'default'}
                    secureTextEntry={field.secure}
                    textAlign="right"
                    autoCapitalize={field.autoCapitalize || 'sentences'}
                    autoComplete={field.autoComplete}
                    autoCorrect={false}
                    textContentType={field.textContentType}
                    accessibilityLabel={field.label}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="ביטול הוספת לקוחה"
              >
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAdd}
                disabled={loading}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="הוספת לקוחה חדשה"
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} accessible={false} />
                ) : (
                  <Text style={styles.submitBtnText}>הוספה</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

// ─── קטגוריות ארוחות ─────────────────────────────────────────────────────────
const MEAL_CATEGORIES = [
  'ארוחת בוקר',
  'ארוחת ביניים',
  'ארוחת צהריים',
  'ארוחת ערב',
  'נשנוש',
  'מתוק',
  'כללי',
];

const CLIENT_FILTERS = [
  { id: 'all', label: 'הכל' },
  { id: 'attention', label: 'דורש טיפול' },
  { id: 'nonResponsive', label: 'לא מגיבות' },
  { id: 'active', label: 'פעילות' },
  { id: 'inactive', label: 'לא פעילות' },
  { id: 'new', label: 'חדשות' },
];

const NEW_CLIENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function toTimestamp(value) {
  const timestamp = new Date(value || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getMeetingPriority(status) {
  switch (status) {
    case 'ממתין לאישור':
      return 3;
    case 'אושר':
      return 2;
    case 'נדחה':
      return 1;
    default:
      return 0;
  }
}

// ─── מודל עריכת ארוחה למאגר ─────────────────────────────────────────────────
function CoachMealEditorModal({ visible, onClose, onSaved, editMeal }) {
  const isEditing = !!editMeal;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('כללי');
  const [description, setDescription] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && editMeal) {
      setTitle(editMeal.title || '');
      setCategory(editMeal.category || 'כללי');
      setDescription(editMeal.description || '');
      setPortion(editMeal.portion || '');
      setCalories(editMeal.calories != null ? String(editMeal.calories) : '');
      setProtein(editMeal.protein != null ? String(editMeal.protein) : '');
      setCarbs(editMeal.carbs != null ? String(editMeal.carbs) : '');
      setFat(editMeal.fat != null ? String(editMeal.fat) : '');
      setIngredients(Array.isArray(editMeal.ingredients) ? editMeal.ingredients.join('\n') : '');
      setInstructions(Array.isArray(editMeal.instructions) ? editMeal.instructions.join('\n') : '');
    } else if (visible) {
      setTitle('');
      setCategory('כללי');
      setDescription('');
      setPortion('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setIngredients('');
      setInstructions('');
    }
  }, [visible, editMeal]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'שם הארוחה הוא שדה חובה');
      return;
    }
    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        category,
        description: description.trim(),
        portion: portion.trim(),
        calories: calories ? Number(calories) : null,
        protein: protein ? Number(protein) : null,
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        ingredients: ingredients.trim() ? ingredients.trim().split('\n').filter(Boolean) : [],
        instructions: instructions.trim() ? instructions.trim().split('\n').filter(Boolean) : [],
        items: [
          {
            id: `item-${Date.now()}`,
            name: title.trim(),
            amount: portion.trim() || '',
            imageUrl: '',
            calories: calories ? Number(calories) : 0,
            protein: protein ? Number(protein) : 0,
            carbs: carbs ? Number(carbs) : 0,
            fat: fat ? Number(fat) : 0,
            notes: description.trim(),
          },
        ],
      };

      if (isEditing) {
        await coachAPI.updateMeal(editMeal.id, data);
        Alert.alert('✅ עודכן', `${data.title} עודכנה במאגר`);
      } else {
        await coachAPI.createMeal(data);
        Alert.alert('✅ נוסף', `${data.title} נוספה למאגר`);
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{isEditing ? 'עריכת ארוחה' : 'ארוחה חדשה למאגר'}</Text>
          <Text style={styles.modalSub}>הארוחה תישמר במאגר ותוכלי להוסיף אותה ללקוחות</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>שם הארוחה *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="לדוגמה: סלט קינואה עם ירקות צלויים"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>קטגוריה</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={{ marginBottom: 4 }}
              >
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  {MEAL_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[styles.catChip, category === cat && styles.catChipActive]}
                    >
                      <Text
                        style={[styles.catChipText, category === cat && styles.catChipTextActive]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>תיאור</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="תיאור קצר של הארוחה"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>גודל מנה</Text>
              <TextInput
                style={styles.input}
                value={portion}
                onChangeText={setPortion}
                placeholder="100 גרם / כוס / יחידה"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>קלוריות</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="350"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>חלבון (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="25"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>פחמימות (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="40"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>שומן (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="12"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>מצרכים (שורה לכל מצרך)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={ingredients}
                onChangeText={setIngredients}
                placeholder={'כוס קינואה\n2 עגבניות\nכפית שמן זית'}
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>הוראות הכנה (שורה לכל שלב)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder={'מבשלים את הקינואה\nחותכים ירקות\nמערבבים הכל'}
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>
          </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>{isEditing ? 'עדכון' : 'הוספה'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </Modal>
  );
}

// ─── לוח בקרה ראשי ──────────────────────────────────────────────────────────
export default function CoachDashboardScreen() {
  const logout = useStore(s => s.logout);

  const [activeTab, setActiveTab] = useState('clients'); // clients | updates | meetings | meals
  const [clients, setClients] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientPlansModal, setShowClientPlansModal] = useState(false);
  const [chatClient, setChatClient] = useState(null);
  const [reminderSendingId, setReminderSendingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [coachStatusFilter, setCoachStatusFilter] = useState('all');
  const [coachTagFilter, setCoachTagFilter] = useState('all');

  // מאגר ארוחות
  const [coachMeals, setCoachMeals] = useState([]);
  const [showMealEditor, setShowMealEditor] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealSearchQuery, setMealSearchQuery] = useState('');
  const [activeMealCategory, setActiveMealCategory] = useState('הכל');

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, updatesRes, meetingsRes, statsRes] = await Promise.all([
        coachAPI.getClients(),
        coachAPI.getUpdates(),
        coachAPI.getMeetings(),
        coachAPI.getStats(),
      ]);
      setClients(clientsRes.clients || []);
      setUpdates(updatesRes.updates || []);
      setMeetings(meetingsRes.meetings || []);
      setStats(statsRes.stats || null);

      // טעינת מאגר ארוחות - לא מפיל את שאר הטעינה אם נכשל
      try {
        const mealsRes = await coachAPI.getMeals();
        setCoachMeals(mealsRes.meals || []);
      } catch {
        setCoachMeals([]);
      }
    } catch (err) {
      Alert.alert('שגיאה בטעינה', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const prioritizedUpdates = useMemo(
    () =>
      [...updates].sort((left, right) => {
        if (left.readByCoach !== right.readByCoach) {
          return Number(left.readByCoach) - Number(right.readByCoach);
        }

        return toTimestamp(right.createdAt || right.date) - toTimestamp(left.createdAt || left.date);
      }),
    [updates]
  );

  const prioritizedMeetings = useMemo(
    () =>
      [...meetings].sort((left, right) => {
        const priorityDelta = getMeetingPriority(right.status) - getMeetingPriority(left.status);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return (
          toTimestamp(right.updatedAt || right.createdAt || right.requestedDate) -
          toTimestamp(left.updatedAt || left.createdAt || left.requestedDate)
        );
      }),
    [meetings]
  );

  const prioritizedClients = useMemo(() => {
    const updatesByClient = new Map();
    const meetingsByClient = new Map();
    const now = Date.now();

    prioritizedUpdates.forEach(update => {
      const current = updatesByClient.get(update.userId) || [];
      updatesByClient.set(update.userId, [...current, update]);
    });

    prioritizedMeetings.forEach(meeting => {
      const current = meetingsByClient.get(meeting.userId) || [];
      meetingsByClient.set(meeting.userId, [...current, meeting]);
    });

    return [...clients]
      .map(client => {
        const clientUpdates = updatesByClient.get(client.id) || [];
        const clientMeetings = meetingsByClient.get(client.id) || [];
        const automationStatus = client.automationStatus || {};
        const unreadUpdatesCount =
          automationStatus.unreadUpdatesCount ??
          clientUpdates.filter(update => !update.readByCoach).length;
        const pendingMeetingsCount =
          automationStatus.pendingMeetingsCount ??
          clientMeetings.filter(meeting => meeting.status === 'ממתין לאישור').length;
        const isNewClient = now - toTimestamp(client.createdAt) <= NEW_CLIENT_WINDOW_MS;
        const lastActivityAt = Math.max(
          toTimestamp(client.createdAt),
          toTimestamp(automationStatus.activities?.lastClientActivityAt),
          toTimestamp(automationStatus.activities?.lastCoachOutreachAt),
          ...clientUpdates.map(update => toTimestamp(update.createdAt || update.date)),
          ...clientMeetings.map(meeting =>
            toTimestamp(meeting.updatedAt || meeting.createdAt || meeting.requestedDate)
          )
        );
        const requiresAttention =
          unreadUpdatesCount > 0
          || pendingMeetingsCount > 0
          || Boolean(automationStatus.needsAttention);
        const automationPriorityBoost =
          automationStatus.level === 'urgent'
            ? 60
            : automationStatus.level === 'follow_up'
              ? 30
              : automationStatus.level === 'monitor'
                ? 10
                : 0;

        return {
          ...client,
          automationStatus,
          unreadUpdatesCount,
          pendingMeetingsCount,
          isNewClient,
          requiresAttention,
          lastActivityAt,
          priorityScore:
            pendingMeetingsCount * 100 +
            unreadUpdatesCount * 10 +
            automationPriorityBoost +
            (automationStatus.reminder?.shouldSendNow ? 12 : 0) +
            (isNewClient ? 5 : 0) +
            (client.isActive ? 1 : 0),
        };
      })
      .sort((left, right) => {
        if (left.requiresAttention !== right.requiresAttention) {
          return Number(right.requiresAttention) - Number(left.requiresAttention);
        }

        if (left.priorityScore !== right.priorityScore) {
          return right.priorityScore - left.priorityScore;
        }

        if (left.lastActivityAt !== right.lastActivityAt) {
          return right.lastActivityAt - left.lastActivityAt;
        }

        return normalizeSearchText(left.name).localeCompare(normalizeSearchText(right.name), 'he');
      });
  }, [clients, prioritizedMeetings, prioritizedUpdates]);

  const clientFilterOptions = useMemo(() => {
    const counts = {
      all: prioritizedClients.length,
      attention: prioritizedClients.filter(client => client.requiresAttention).length,
      nonResponsive: prioritizedClients.filter(client => client.automationStatus?.isNonResponsive).length,
      active: prioritizedClients.filter(client => client.isActive).length,
      inactive: prioritizedClients.filter(client => !client.isActive).length,
      new: prioritizedClients.filter(client => client.isNewClient).length,
    };

    return CLIENT_FILTERS.map(filter => ({
      ...filter,
      count: counts[filter.id] || 0,
    }));
  }, [prioritizedClients]);

  const coachStatusOptions = useMemo(() => {
    const counts = prioritizedClients.reduce((accumulator, client) => {
      const status = String(client.coachStatus || '').trim();
      if (!status) return accumulator;

      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { id: 'all', label: 'כל הסטטוסים', count: prioritizedClients.length },
      ...Object.keys(counts)
        .sort((left, right) => normalizeSearchText(left).localeCompare(normalizeSearchText(right), 'he'))
        .map(status => ({ id: status, label: status, count: counts[status] })),
    ];
  }, [prioritizedClients]);

  const coachTagOptions = useMemo(() => {
    const counts = prioritizedClients.reduce((accumulator, client) => {
      const tags = Array.isArray(client.coachTags) ? client.coachTags : [];

      tags.forEach(tag => {
        const normalizedTag = String(tag || '').trim();
        if (!normalizedTag) return;
        accumulator[normalizedTag] = (accumulator[normalizedTag] || 0) + 1;
      });

      return accumulator;
    }, {});

    return [
      { id: 'all', label: 'כל התגיות', count: prioritizedClients.length },
      ...Object.keys(counts)
        .sort((left, right) => normalizeSearchText(left).localeCompare(normalizeSearchText(right), 'he'))
        .map(tag => ({ id: tag, label: tag, count: counts[tag] })),
    ];
  }, [prioritizedClients]);

  const attentionSummary = useMemo(
    () => ({
      clients: prioritizedClients.filter(client => client.requiresAttention).length,
      meetings: prioritizedClients.reduce((sum, client) => sum + client.pendingMeetingsCount, 0),
      updates: prioritizedClients.reduce((sum, client) => sum + client.unreadUpdatesCount, 0),
    }),
    [prioritizedClients]
  );

  const automationSummary = useMemo(
    () => ({
      overdue: prioritizedClients.filter(client => client.automationStatus?.isNonResponsive).length,
      urgent: prioritizedClients.filter(client => client.automationStatus?.level === 'urgent').length,
      reminders: prioritizedClients.filter(client => client.automationStatus?.reminder?.shouldSendNow)
        .length,
    }),
    [prioritizedClients]
  );

  const handleMeetingStatus = async (meetingId, status) => {
    try {
      await coachAPI.updateMeeting(meetingId, status);
      Alert.alert('✅', `פגישה ${status === 'אושר' ? 'אושרה' : 'נדחתה'}`);
      loadData();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const normalizedClientSearchQuery = normalizeSearchText(searchQuery);

  const visibleClients = prioritizedClients.filter(client => {
    const matchesSearch =
      !normalizedClientSearchQuery ||
      [
        client.name,
        client.email,
        client.goal,
        client.phone,
        client.coachStatus,
        ...(Array.isArray(client.coachTags) ? client.coachTags : []),
      ]
        .filter(Boolean)
        .some(value => normalizeSearchText(value).includes(normalizedClientSearchQuery));

    const matchesFilter =
      clientFilter === 'all' ||
      (clientFilter === 'attention' && client.requiresAttention) ||
      (clientFilter === 'nonResponsive' && client.automationStatus?.isNonResponsive) ||
      (clientFilter === 'active' && client.isActive) ||
      (clientFilter === 'inactive' && !client.isActive) ||
      (clientFilter === 'new' && client.isNewClient);

    const matchesCoachStatus =
      coachStatusFilter === 'all' || String(client.coachStatus || '').trim() === coachStatusFilter;

    const matchesCoachTag =
      coachTagFilter === 'all' ||
      (Array.isArray(client.coachTags) && client.coachTags.includes(coachTagFilter));

    return matchesSearch && matchesFilter && matchesCoachStatus && matchesCoachTag;
  });

  const openClientModal = clientId => {
    setSelectedClientId(clientId);
    setShowClientPlansModal(true);
  };

  const closeClientModal = () => {
    setShowClientPlansModal(false);
    setSelectedClientId(null);
  };

  const handleChat = client => setChatClient(client);

  const handleReminder = async client => {
    if (!client?.id) return;
    setReminderSendingId(client.id);
    try {
      await coachAPI.sendAutomationReminder(client.id);
      Alert.alert('נשלחה', `תזכורת נשלחה ל${client.name} ✅`);
      loadData();
    } catch (err) {
      Alert.alert('שגיאה', err.message || 'תזכורת לא נשלחה');
    } finally {
      setReminderSendingId(null);
    }
  };

  const handleDeleteMeal = mealId => {
    const meal = coachMeals.find(m => m.id === mealId);
    Alert.alert('מחיקת ארוחה', `למחוק את "${meal?.title}" מהמאגר?`, [
      { text: 'ביטול' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          try {
            await coachAPI.deleteMeal(mealId);
            loadData();
          } catch (err) {
            Alert.alert('שגיאה', err.message);
          }
        },
      },
    ]);
  };

  const openMealEditor = (meal = null) => {
    setEditingMeal(meal);
    setShowMealEditor(true);
  };

  const closeMealEditor = () => {
    setShowMealEditor(false);
    setEditingMeal(null);
  };

  const handleLogout = async () => {
    try {
      await tokenStorage.remove();
    } finally {
      logout();
    }
  };

  const mealLibrary = mergeRecipeCatalogWithCoachMeals(coachMeals);

  const mealCategoryList = ['הכל', ...new Set(mealLibrary.map(m => m.category).filter(Boolean))];

  const filteredMeals = mealLibrary.filter(meal => {
    const matchesCategory = activeMealCategory === 'הכל' || meal.category === activeMealCategory;
    const query = mealSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      meal.title.toLowerCase().includes(query) ||
      (meal.description || '').toLowerCase().includes(query) ||
      (meal.category || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <DismissKeyboardView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('יציאה', 'האם לצאת?', [
              { text: 'ביטול' },
              { text: 'יציאה', style: 'destructive', onPress: handleLogout },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>לוח בקרה</Text>
          <Text style={styles.headerSub}>שלהבת מחטבת 🔥</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard
              value={stats.totalClients}
              label="לקוחות"
              icon="people-outline"
              color={COLORS.primary}
            />
            <StatCard
              value={stats.pendingMeetings}
              label="פגישות ממתינות"
              icon="calendar-outline"
              color="#FFA726"
            />
            <StatCard
              value={stats.unreadUpdates}
              label="עדכונים חדשים"
              icon="mail-unread-outline"
              color="#42A5F5"
            />
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { id: 'clients', label: `לקוחות (${clients.length})`, icon: 'people' },
            { id: 'meals', label: `מאגר (${mealLibrary.length})`, icon: 'restaurant' },
            { id: 'updates', label: `עדכונים (${updates.length})`, icon: 'newspaper' },
            { id: 'meetings', label: `פגישות (${meetings.length})`, icon: 'calendar' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                size={16}
                color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {/* ─── טאב לקוחות ─── */}
          {activeTab === 'clients' && (
            <>
              <View style={styles.priorityCard}>
                <View style={styles.priorityRow}>
                  <View style={styles.priorityMetric}>
                    <Text style={styles.priorityValue}>{attentionSummary.clients}</Text>
                    <Text style={styles.priorityLabel}>לקוחות דורשות טיפול</Text>
                  </View>
                  <View style={styles.priorityDivider} />
                  <View style={styles.priorityMetric}>
                    <Text style={styles.priorityValue}>{attentionSummary.meetings}</Text>
                    <Text style={styles.priorityLabel}>פגישות ממתינות</Text>
                  </View>
                  <View style={styles.priorityDivider} />
                  <View style={styles.priorityMetric}>
                    <Text style={styles.priorityValue}>{attentionSummary.updates}</Text>
                    <Text style={styles.priorityLabel}>עדכונים חדשים</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.priorityCard, styles.automationPriorityCard]}>
                <View style={styles.priorityRow}>
                  <View style={styles.priorityMetric}>
                    <Text style={[styles.priorityValue, styles.priorityValueDanger]}>
                      {automationSummary.overdue}
                    </Text>
                    <Text style={styles.priorityLabel}>לקוחות לא מגיבות</Text>
                  </View>
                  <View style={styles.priorityDivider} />
                  <View style={styles.priorityMetric}>
                    <Text style={[styles.priorityValue, styles.priorityValueDanger]}>
                      {automationSummary.urgent}
                    </Text>
                    <Text style={styles.priorityLabel}>מצבים דחופים</Text>
                  </View>
                  <View style={styles.priorityDivider} />
                  <View style={styles.priorityMetric}>
                    <Text style={[styles.priorityValue, styles.priorityValueWarning]}>
                      {automationSummary.reminders}
                    </Text>
                    <Text style={styles.priorityLabel}>תזכורות מוכנות</Text>
                  </View>
                </View>
              </View>

              {automationSummary.overdue > 0 ? (
                <View style={styles.sectionNoticeCard}>
                  <Ionicons name="flash-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.sectionNoticeText}>
                    {automationSummary.overdue} לקוחות מסומנות כלא מגיבות כרגע
                  </Text>
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={styles.clientFiltersScroll}
              >
                <View style={styles.clientFiltersRow}>
                  {clientFilterOptions.map(filter => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.clientFilterChip,
                        clientFilter === filter.id && styles.clientFilterChipActive,
                      ]}
                      onPress={() => setClientFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.clientFilterChipText,
                          clientFilter === filter.id && styles.clientFilterChipTextActive,
                        ]}
                      >
                        {filter.label} ({filter.count})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {coachStatusOptions.length > 1 ? (
                <>
                  <Text style={styles.secondaryFilterLabel}>סינון לפי סטטוס ליווי</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    style={styles.clientFiltersScroll}
                  >
                    <View style={styles.clientFiltersRow}>
                      {coachStatusOptions.map(option => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.clientFilterChip,
                            coachStatusFilter === option.id && styles.clientFilterChipActive,
                          ]}
                          onPress={() => setCoachStatusFilter(option.id)}
                        >
                          <Text
                            style={[
                              styles.clientFilterChipText,
                              coachStatusFilter === option.id && styles.clientFilterChipTextActive,
                            ]}
                          >
                            {option.label} ({option.count})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : null}

              {coachTagOptions.length > 1 ? (
                <>
                  <Text style={styles.secondaryFilterLabel}>סינון לפי תגיות</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    style={styles.clientFiltersScroll}
                  >
                    <View style={styles.clientFiltersRow}>
                      {coachTagOptions.map(option => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.clientFilterChip,
                            coachTagFilter === option.id && styles.clientFilterChipActive,
                          ]}
                          onPress={() => setCoachTagFilter(option.id)}
                        >
                          <Text
                            style={[
                              styles.clientFilterChipText,
                              coachTagFilter === option.id && styles.clientFilterChipTextActive,
                            ]}
                          >
                            {option.label} ({option.count})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : null}

              <Text style={styles.clientSortHint}>
                לקוחות שלא מגיבות, עם פגישות ממתינות ועדכונים חדשים מוצגות ראשונות.
              </Text>

              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפשי לקוחה לפי שם או אימייל..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  textAlign="right"
                />
              </View>

              {visibleClients.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {clients.length === 0 ? 'אין לקוחות עדיין' : 'לא נמצאו לקוחות תואמות'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {clients.length === 0
                      ? 'לחצי על + למעלה להוספת לקוחה חדשה'
                      : 'נסי לנקות את החיפוש או להחליף פילטר'}
                  </Text>
                </View>
              ) : (
                visibleClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onPress={() => openClientModal(client.id)}
                    onChat={handleChat}
                    onReminder={handleReminder}
                    sendingReminder={reminderSendingId === client.id}
                  />
                ))
              )}
            </>
          )}

          {/* ─── טאב מאגר ארוחות ─── */}
          {activeTab === 'meals' && (
            <>
              {/* חיפוש */}
              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפשי ארוחה לפי שם או תיאור..."
                  placeholderTextColor={COLORS.textMuted}
                  value={mealSearchQuery}
                  onChangeText={setMealSearchQuery}
                  textAlign="right"
                />
              </View>

              {/* קטגוריות */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={{ marginBottom: 12 }}
              >
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  {mealCategoryList.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setActiveMealCategory(cat)}
                      style={[styles.catChip, activeMealCategory === cat && styles.catChipActive]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          activeMealCategory === cat && styles.catChipTextActive,
                        ]}
                      >
                        {cat} (
                        {cat === 'הכל'
                          ? mealLibrary.length
                          : mealLibrary.filter(m => m.category === cat).length}
                        )
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* כפתור הוספה */}
              <TouchableOpacity style={styles.addMealBtn} onPress={() => openMealEditor()}>
                <Text style={styles.addMealBtnText}>הוסיפי ארוחה למאגר</Text>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {filteredMeals.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {mealLibrary.length === 0 ? 'המאגר ריק' : 'אין תוצאות'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {mealLibrary.length === 0
                      ? 'הוסיפי ארוחות ומתכונים שתוכלי לשבץ ללקוחות'
                      : 'נסי לשנות את החיפוש או הקטגוריה'}
                  </Text>
                </View>
              ) : (
                filteredMeals.map(meal => {
                  const isCatalogMeal = meal.source === CATALOG_MEAL_SOURCE;

                  return (
                    <View key={meal.id} style={styles.mealCard}>
                      <View style={styles.mealCardHeader}>
                        <View style={styles.mealCalPill}>
                          <Text style={styles.mealCalPillText}>
                            {meal.calories ? `${meal.calories} קל׳` : '—'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mealCardTitle}>{meal.title}</Text>
                          <Text style={styles.mealCardMeta}>
                            {meal.category}
                            {meal.portion ? ` · ${meal.portion}` : ''}
                          </Text>
                        </View>
                      </View>

                      {meal.description ? (
                        <Text style={styles.mealCardDesc} numberOfLines={2}>
                          {meal.description}
                        </Text>
                      ) : null}

                      {/* מאקרו */}
                      <View style={styles.mealMacros}>
                        {meal.protein != null && (
                          <Text style={styles.mealMacroText}>ח׳ {meal.protein}ג׳</Text>
                        )}
                        {meal.carbs != null && (
                          <Text style={styles.mealMacroText}>פ׳ {meal.carbs}ג׳</Text>
                        )}
                        {meal.fat != null && (
                          <Text style={styles.mealMacroText}>ש׳ {meal.fat}ג׳</Text>
                        )}
                      </View>

                      {isCatalogMeal ? (
                        <View style={styles.builtInMealBadge}>
                          <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.builtInMealBadgeText}>מתכון מובנה מהספרייה</Text>
                        </View>
                      ) : (
                        <View style={styles.mealCardActions}>
                          <TouchableOpacity
                            onPress={() => handleDeleteMeal(meal.id)}
                            style={styles.mealSecondaryBtn}
                          >
                            <Ionicons name="trash-outline" size={16} color="#F44336" />
                            <Text style={[styles.mealSecondaryBtnText, { color: '#F44336' }]}>
                              מחיקה
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openMealEditor(meal)}
                            style={styles.mealPrimaryBtn}
                          >
                            <Ionicons name="create-outline" size={16} color={COLORS.white} />
                            <Text style={styles.mealPrimaryBtnText}>עריכה</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ─── טאב עדכונים ─── */}
          {activeTab === 'updates' && (
            <>
              {prioritizedUpdates.length > 0 ? (
                <View style={styles.sectionNoticeCard}>
                  <Ionicons name="mail-unread-outline" size={16} color={COLORS.info} />
                  <Text style={styles.sectionNoticeText}>
                    {attentionSummary.updates} עדכונים חדשים דורשים מעבר
                  </Text>
                </View>
              ) : null}

              {prioritizedUpdates.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>אין עדכונים עדיין</Text>
                  <Text style={styles.emptyText}>הלקוחות ישלחו עדכונים שבועיים מהאפליקציה</Text>
                </View>
              ) : (
                prioritizedUpdates.map(update => (
                  <View
                    key={update.id}
                    style={[styles.updateCard, !update.readByCoach && styles.updateCardUnread]}
                  >
                    <View style={styles.updateHeader}>
                      <View style={styles.updateMetaLeft}>
                        {!update.readByCoach ? (
                          <View style={styles.updateUnreadBadge}>
                            <Text style={styles.updateUnreadBadgeText}>חדש</Text>
                          </View>
                        ) : null}
                        <Text style={styles.updateDate}>{update.date}</Text>
                      </View>
                      <Text style={styles.updateClient}>{update.clientName}</Text>
                    </View>
                    <Text style={styles.updateText}>{update.text}</Text>
                  </View>
                ))
              )}
            </>
          )}

          {/* ─── טאב פגישות ─── */}
          {activeTab === 'meetings' && (
            <>
              {prioritizedMeetings.length > 0 ? (
                <View style={styles.sectionNoticeCard}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.sectionNoticeText}>
                    {attentionSummary.meetings} פגישות עדיין ממתינות לאישור
                  </Text>
                </View>
              ) : null}

              {prioritizedMeetings.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>אין בקשות פגישות</Text>
                  <Text style={styles.emptyText}>הלקוחות יכולות לבקש פגישה מהאפליקציה</Text>
                </View>
              ) : (
                prioritizedMeetings.map(meeting => (
                  <View key={meeting.id} style={styles.meetingCard}>
                    <View style={styles.meetingHeader}>
                      <View
                        style={[
                          styles.meetingBadge,
                          {
                            backgroundColor:
                              meeting.status === 'אושר'
                                ? '#2E7D3233'
                                : meeting.status === 'נדחה'
                                  ? '#B71C1C33'
                                  : '#E65100' + '33',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.meetingBadgeText,
                            {
                              color:
                                meeting.status === 'אושר'
                                  ? '#4CAF50'
                                  : meeting.status === 'נדחה'
                                    ? '#F44336'
                                    : '#FFA726',
                            },
                          ]}
                        >
                          {meeting.status}
                        </Text>
                      </View>
                      <Text style={styles.meetingClient}>{meeting.clientName}</Text>
                    </View>
                    <Text style={styles.meetingDate}>📅 {meeting.requestedDate}</Text>
                    {meeting.notes ? (
                      <Text style={styles.meetingNotes}>{meeting.notes}</Text>
                    ) : null}

                    {meeting.status === 'ממתין לאישור' && (
                      <View style={styles.meetingActions}>
                        <TouchableOpacity
                          style={[styles.meetingBtn, styles.rejectBtn]}
                          onPress={() => handleMeetingStatus(meeting.id, 'נדחה')}
                        >
                          <Text style={styles.rejectBtnText}>דחייה</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.meetingBtn, styles.approveBtn]}
                          onPress={() => handleMeetingStatus(meeting.id, 'אושר')}
                        >
                          <Text style={styles.approveBtnText}>אישור ✓</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </View>
        </ScrollView>
      </DismissKeyboardView>

      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={loadData}
      />

      <CoachClientPlansModal
        visible={showClientPlansModal}
        clientId={selectedClientId}
        onClose={closeClientModal}
        onSaved={loadData}
      />

      <CoachClientChatModal
        visible={!!chatClient}
        client={chatClient}
        onClose={() => setChatClient(null)}
        onMessageSent={() => loadData()}
      />

      <CoachMealEditorModal
        visible={showMealEditor}
        onClose={closeMealEditor}
        onSaved={loadData}
        editMeal={editingMeal}
      />
    </SafeAreaView>
  );
}

/* eslint-disable react-native/sort-styles */
const styles = StyleSheet.create({
  addBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '22',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  approveBtn: { backgroundColor: '#2E7D32' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  cancelBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  clientActionHint: { color: COLORS.primary, fontSize: 11, marginTop: 6, textAlign: 'right' },
  clientAutomationIcon: {
    marginTop: 1,
  },
  clientAutomationRow: {
    alignItems: 'flex-start',
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 8,
  },
  clientAutomationText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  clientAvatar: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '33',
    borderRadius: 23,
    flexShrink: 0,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  clientAvatarText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },

  clientCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  clientBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clientCardPriority: {
    borderColor: COLORS.primary + '66',
  },
  clientBadgeNew: { backgroundColor: '#2E7D3233' },
  clientBadgeNewText: { color: COLORS.success },
  clientCoachStatusBadge: {
    alignSelf: 'flex-end',
    backgroundColor: `${COLORS.accent}22`,
    marginTop: 6,
  },
  clientCoachStatusText: { color: COLORS.accent },
  clientBadgeAutomation: {
    borderWidth: 1,
  },
  clientBadgePending: { backgroundColor: '#E6510033' },
  clientBadgePendingText: { color: '#FFA726' },
  clientBadgeText: { fontSize: 10, fontWeight: '700' },
  clientBadgeReminder: { backgroundColor: `${COLORS.primary}22` },
  clientBadgeReminderText: { color: COLORS.primary },
  clientTagBadge: { backgroundColor: `${COLORS.info}22` },
  clientTagBadgeText: { color: COLORS.info },
  clientBadgeUnread: { backgroundColor: '#1565C033' },
  clientBadgeUnreadText: { color: COLORS.info },
  clientBadgesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  clientTagsRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  clientEmail: { color: COLORS.textMuted, fontSize: 12, textAlign: 'right' },
  clientFiltersRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    paddingBottom: 4,
  },
  clientFiltersScroll: {
    marginBottom: 8,
  },
  clientFilterChip: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clientFilterChipActive: {
    backgroundColor: COLORS.primary + '22',
    borderColor: COLORS.primary,
  },
  clientFilterChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  clientFilterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  clientGoal: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'right' },
  clientInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  clientMeta: { alignItems: 'flex-start', gap: 4 },
  clientName: { color: COLORS.white, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  clientStatus: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  clientStatusText: { fontSize: 10, fontWeight: '600' },
  clientWeight: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  clientSparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clientSparklineLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },

  clientQuickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  clientQuickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    backgroundColor: COLORS.cardLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientQuickActionAccent: {
    borderColor: COLORS.primary + '55',
    backgroundColor: COLORS.primary + '15',
  },
  clientQuickActionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  content: { paddingBottom: 32, paddingHorizontal: 16 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  clientSortHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'right',
  },
  secondaryFilterLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'right',
  },
  formMessage: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formMessageError: {
    backgroundColor: '#3A1616',
    borderColor: '#7F2C2C',
  },
  formMessageSuccess: {
    backgroundColor: '#17331D',
    borderColor: '#2F6F3C',
  },
  formMessageIcon: { marginLeft: 8 },
  formMessageText: {
    color: COLORS.white,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  formMessageTextError: { color: COLORS.danger },
  formMessageTextSuccess: { color: COLORS.success },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4, textAlign: 'right' },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerCenter: { alignItems: 'center' },
  headerSub: { color: COLORS.primary, fontSize: 12 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 14,
    padding: 12,
    textAlign: 'right',
  },
  loadingContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  meetingActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  meetingBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  meetingBadgeText: { fontSize: 11, fontWeight: '700' },
  meetingBtn: { alignItems: 'center', borderRadius: 10, flex: 1, paddingVertical: 10 },
  meetingCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  meetingClient: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  meetingDate: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4, textAlign: 'right' },
  meetingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meetingNotes: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8, textAlign: 'right' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 20,
    width: 40,
  },

  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.7)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    flexShrink: 1,
    maxHeight: '88%',
    padding: 24,
  },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  priorityCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary + '44',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  automationPriorityCard: {
    borderColor: `${COLORS.warning}44`,
  },
  priorityDivider: { backgroundColor: COLORS.border, height: 34, width: 1 },
  priorityLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  priorityMetric: { alignItems: 'center', flex: 1 },
  priorityRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  priorityValue: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  priorityValueDanger: { color: COLORS.danger },
  priorityValueWarning: { color: COLORS.warning },
  rejectBtn: { backgroundColor: COLORS.card, borderColor: '#B71C1C', borderWidth: 1 },
  rejectBtnText: { color: '#F44336', fontSize: 14, fontWeight: '600' },
  safe: { backgroundColor: COLORS.background, flex: 1 },
  searchInput: {
    color: COLORS.white,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    textAlign: 'right',
  },
  searchWrapper: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    marginBottom: 12,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  statLabel: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },

  submitBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 2,
    paddingVertical: 14,
  },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: COLORS.primary + '22' },
  tabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabs: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 4,
  },
  sectionNoticeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionNoticeText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  updateCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  updateCardUnread: {
    borderColor: '#42A5F566',
  },
  updateClient: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  updateDate: { color: COLORS.textMuted, fontSize: 12 },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  updateMetaLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  updateUnreadBadge: {
    backgroundColor: '#42A5F522',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  updateUnreadBadgeText: { color: COLORS.info, fontSize: 10, fontWeight: '700' },
  updateText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },

  // ─── סגנונות מאגר ארוחות ───
  catChip: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: COLORS.primary + '22',
    borderColor: COLORS.primary,
  },
  catChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  addMealBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '44',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
    paddingVertical: 12,
  },
  addMealBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  mealCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  mealCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  mealCardTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  mealCardMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  mealCardDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
    textAlign: 'right',
  },
  mealCalPill: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mealCalPillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  mealMacros: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 8,
  },
  mealMacroText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  mealCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  builtInMealBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '14',
    borderColor: COLORS.primary + '33',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  builtInMealBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  mealSecondaryBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mealSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealPrimaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mealPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
/* eslint-enable react-native/sort-styles */
