/**
 * RegisterScreen.js - מסך הרשמה ללקוחה חדשה
 * =============================================
 * לקוחה חדשה יכולה להירשם בעצמה, או שהמאמנת פותחת לה חשבון.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Alert, ActivityIndicator, AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DismissKeyboardView from '../components/ui/DismissKeyboardView';
import { COLORS } from '../theme/colors';
import { authAPI, tokenStorage } from '../services/api';
import useStore from '../store/useStore';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '../utils/keyboard';

function parseOptionalNumber(value) {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // שלב 1: פרטים בסיסיים, שלב 2: מידות
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  // שלב 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // שלב 2
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState('חיטוב');

  const login = useStore((s) => s.login);

  const GOALS = ['חיטוב', 'ירידה במשקל', 'עלייה במסה', 'שיפור סיבולת', 'בריאות כללית'];

  const showFormMessage = (text, type = 'error') => {
    const nextMessage = text ? { text, type } : null;
    setFormMessage(nextMessage);

    if (text) {
      AccessibilityInfo.announceForAccessibility(text);
    }

    return false;
  };

  const clearFormMessage = () => {
    if (formMessage) {
      setFormMessage(null);
    }
  };

  const updateStep = (nextStep) => {
    clearFormMessage();
    setStep(nextStep);
    AccessibilityInfo.announceForAccessibility(`עברת לשלב ${nextStep} מתוך 2`);
  };

  const validateStep1 = () => {
    if (!name.trim()) return showFormMessage('נא להזין שם מלא');
    if (!email.trim() || !email.includes('@')) return showFormMessage('נא להזין אימייל תקין');
    if (!password || password.length < 6) return showFormMessage('הסיסמה חייבת להיות לפחות 6 תווים');
    if (password !== confirmPassword) return showFormMessage('הסיסמאות אינן תואמות');

    return true;
  };

  const validateStep2 = () => {
    const parsedWeight = parseOptionalNumber(weight);
    const parsedHeight = parseOptionalNumber(height);
    const parsedAge = parseOptionalInteger(age);

    if (weight && parsedWeight == null) return showFormMessage('משקל חייב להיות מספר תקין');
    if (height && parsedHeight == null) return showFormMessage('גובה חייב להיות מספר תקין');
    if (age && parsedAge == null) return showFormMessage('גיל חייב להיות מספר שלם');
    if (parsedWeight !== undefined && parsedWeight <= 0) return showFormMessage('משקל חייב להיות גדול מאפס');
    if (parsedHeight !== undefined && parsedHeight <= 0) return showFormMessage('גובה חייב להיות גדול מאפס');
    if (parsedAge !== undefined && parsedAge <= 0) return showFormMessage('גיל חייב להיות גדול מאפס');

    return true;
  };

  const handleNext = () => {
    if (validateStep1()) updateStep(2);
  };

  const handleRegister = async () => {
    if (!validateStep2()) {
      return;
    }

    const parsedWeight = parseOptionalNumber(weight);
    const parsedHeight = parseOptionalNumber(height);
    const parsedAge = parseOptionalInteger(age);

    setLoading(true);
    clearFormMessage();

    try {
      const result = await authAPI.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        weight: parsedWeight,
        height: parsedHeight,
        age: parsedAge,
        goal,
      });

      // שמור טוקן
      await tokenStorage.save(result.token);

      // עדכן state
      login(result.user);

      Alert.alert('ברוכה הבאה! 🎉', `${result.user.name}, החשבון שלך נוצר בהצלחה!`);

    } catch (err) {
      showFormMessage(err.message || 'לא ניתן ליצור חשבון כרגע');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <DismissKeyboardView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* כותרת */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step === 1 ? navigation.goBack() : updateStep(1)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? 'חזרה למסך הכניסה' : 'חזרה לשלב הקודם'}
            accessibilityHint={step === 1 ? 'חזרה למסך הכניסה' : 'חזרה לשלב הפרטים הבסיסיים'}
          >
            <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.title}>הצטרפות לשלהבת 🔥</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'צרי חשבון בחינם' : 'פרטים נוספים (אופציונלי)'}
          </Text>

          {/* Progress Bar */}
          <View
            style={styles.progressRow}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`תהליך הרשמה. שלב ${step} מתוך 2`}
            accessibilityValue={{ min: 1, max: 2, now: step }}
          >
            <View style={[styles.progressStep, styles.progressActive]}>
              <Text style={styles.progressNum}>1</Text>
            </View>
            <View style={[styles.progressLine, step === 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, step === 2 && styles.progressActive]}>
              <Text style={[styles.progressNum, step === 2 && styles.progressNumActive]}>2</Text>
            </View>
          </View>

          <View style={styles.form}>
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

            {/* ─── שלב 1 ─── */}
            {step === 1 && (
              <>
                <InputField
                  label="שם מלא"
                  icon="person-outline"
                  value={name}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setName(value);
                  }}
                  placeholder="שם פרטי ומשפחה"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  accessibilityHint="הזיני שם פרטי ומשפחה"
                />
                <InputField
                  label="אימייל"
                  icon="mail-outline"
                  value={email}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setEmail(value);
                  }}
                  placeholder="example@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  accessibilityHint="הזיני כתובת אימייל תקינה"
                />
                <InputField
                  label="טלפון (אופציונלי)"
                  icon="call-outline"
                  value={phone}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setPhone(value);
                  }}
                  placeholder="050-0000000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                />
                <InputField
                  label="סיסמה"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setPassword(value);
                  }}
                  placeholder="לפחות 6 תווים"
                  secureTextEntry={!showPass}
                  rightIcon={showPass ? 'eye-outline' : 'eye-off-outline'}
                  onRightIconPress={() => setShowPass(!showPass)}
                  rightIconAccessibilityLabel={showPass ? 'הסתרי סיסמה' : 'הציגי סיסמה'}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                />
                <InputField
                  label="אישור סיסמה"
                  icon="lock-closed-outline"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setConfirmPassword(value);
                  }}
                  placeholder="הזיני שוב את הסיסמה"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleNext}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="המשך לשלב הבא"
                  accessibilityHint="מעבר לשלב של פרטים נוספים"
                >
                  <Text style={styles.primaryBtnText}>המשך ←</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ─── שלב 2 ─── */}
            {step === 2 && (
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label='משקל (ק"ג)'
                      icon="scale-outline"
                      value={weight}
                      onChangeText={(value) => {
                        clearFormMessage();
                        setWeight(value);
                      }}
                      placeholder="לדוגמה: 65"
                      keyboardType="decimal-pad"
                      accessibilityHint="אופציונלי. הזיני משקל במספרים בלבד"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label='גובה (ס"מ)'
                      icon="resize-outline"
                      value={height}
                      onChangeText={(value) => {
                        clearFormMessage();
                        setHeight(value);
                      }}
                      placeholder="לדוגמה: 165"
                      keyboardType="number-pad"
                      accessibilityHint="אופציונלי. הזיני גובה במספרים בלבד"
                    />
                  </View>
                </View>

                <InputField
                  label="גיל"
                  icon="calendar-outline"
                  value={age}
                  onChangeText={(value) => {
                    clearFormMessage();
                    setAge(value);
                  }}
                  placeholder="לדוגמה: 28"
                  keyboardType="number-pad"
                  accessibilityHint="אופציונלי. הזיני גיל במספר שלם"
                />

                {/* בחירת מטרה */}
                <Text style={styles.label}>מטרת האימון</Text>
                <View style={styles.goalsGrid}>
                  {GOALS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.goalChip, goal === g && styles.goalChipActive]}
                      onPress={() => {
                        clearFormMessage();
                        setGoal(g);
                      }}
                      accessible={true}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: goal === g }}
                      accessibilityLabel={`מטרת אימון ${g}`}
                    >
                      <Text style={[styles.goalChipText, goal === g && styles.goalChipTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleRegister}
                  disabled={loading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="יצירת חשבון חדש"
                  accessibilityHint="שליחת פרטי ההרשמה ופתיחת החשבון"
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>הצטרפי עכשיו 🔥</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={handleRegister}
                  disabled={loading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="דלגי על הפרטים האופציונליים"
                  accessibilityHint="יצירת חשבון בלי למלא משקל, גובה וגיל בשלב זה"
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  <Text style={styles.skipBtnText}>דלג - מלאי מאוחר יותר</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footer}>
            כבר יש לך חשבון?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="link"
            >
              כניסה
            </Text>
          </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}

// קומפוננטת שדה קלט
function InputField({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  accessibilityHint,
  ...props
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.inputActionBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel || 'פעולה על השדה'}
          >
            <Ionicons name={rightIcon} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          textAlign="right"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          autoCorrect={false}
          {...props}
        />
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  backBtn: { alignSelf: 'flex-end', padding: 8, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.white, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  progressStep: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  progressActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressNum: { color: COLORS.textMuted, fontWeight: 'bold' },
  progressNumActive: { color: COLORS.white },
  progressLine: { flex: 0, width: 60, height: 2, backgroundColor: COLORS.border, marginHorizontal: 8 },
  progressLineActive: { backgroundColor: COLORS.primary },
  form: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  formMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  formMessageTextError: { color: COLORS.danger },
  formMessageTextSuccess: { color: COLORS.success },
  label: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, height: 52, paddingHorizontal: 14,
  },
  inputActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 44,
    minWidth: 44,
  },
  input: { flex: 1, color: COLORS.white, fontSize: 15, textAlign: 'right' },
  row: { flexDirection: 'row' },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'flex-end' },
  goalChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.inputBg,
  },
  goalChipActive: { backgroundColor: COLORS.primary + '33', borderColor: COLORS.primary },
  goalChipText: { color: COLORS.textSecondary, fontSize: 13 },
  goalChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  skipBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  skipBtnText: { color: COLORS.textMuted, fontSize: 14 },
  footer: { marginTop: 24, color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
});
