/**
 * RegisterScreen.js - מסך הרשמה ללקוחה חדשה
 * =============================================
 * לקוחה חדשה יכולה להירשם בעצמה, או שהמאמנת פותחת לה חשבון.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { authAPI, tokenStorage } from '../services/api';
import useStore from '../store/useStore';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // שלב 1: פרטים בסיסיים, שלב 2: מידות
  const [loading, setLoading] = useState(false);

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

  const validateStep1 = () => {
    if (!name.trim()) { Alert.alert('שגיאה', 'נא להזין שם מלא'); return false; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('שגיאה', 'נא להזין אימייל תקין'); return false; }
    if (!password || password.length < 6) { Alert.alert('שגיאה', 'הסיסמה חייבת להיות לפחות 6 תווים'); return false; }
    if (password !== confirmPassword) { Alert.alert('שגיאה', 'הסיסמאות אינן תואמות'); return false; }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        age: age ? parseInt(age) : undefined,
        goal,
      });

      // שמור טוקן
      await tokenStorage.save(result.token);

      // עדכן state
      login(result.user);

      Alert.alert('ברוכה הבאה! 🎉', `${result.user.name}, החשבון שלך נוצר בהצלחה!`);

    } catch (err) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: 'height' })}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* כותרת */}
          <TouchableOpacity style={styles.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
            <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.title}>הצטרפות לשלהבת 🔥</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'צרי חשבון בחינם' : 'פרטים נוספים (אופציונלי)'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={[styles.progressStep, styles.progressActive]}>
              <Text style={styles.progressNum}>1</Text>
            </View>
            <View style={[styles.progressLine, step === 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, step === 2 && styles.progressActive]}>
              <Text style={[styles.progressNum, step === 2 && styles.progressNumActive]}>2</Text>
            </View>
          </View>

          <View style={styles.form}>

            {/* ─── שלב 1 ─── */}
            {step === 1 && (
              <>
                <InputField
                  label="שם מלא"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  placeholder="שם פרטי ומשפחה"
                />
                <InputField
                  label="אימייל"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <InputField
                  label="טלפון (אופציונלי)"
                  icon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="050-0000000"
                  keyboardType="phone-pad"
                />
                <InputField
                  label="סיסמה"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="לפחות 6 תווים"
                  secureTextEntry={!showPass}
                  rightIcon={showPass ? 'eye-outline' : 'eye-off-outline'}
                  onRightIconPress={() => setShowPass(!showPass)}
                />
                <InputField
                  label="אישור סיסמה"
                  icon="lock-closed-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="הזיני שוב את הסיסמה"
                  secureTextEntry={!showPass}
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
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
                      onChangeText={setWeight}
                      placeholder="לדוגמה: 65"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label='גובה (ס"מ)'
                      icon="resize-outline"
                      value={height}
                      onChangeText={setHeight}
                      placeholder="לדוגמה: 165"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <InputField
                  label="גיל"
                  icon="calendar-outline"
                  value={age}
                  onChangeText={setAge}
                  placeholder="לדוגמה: 28"
                  keyboardType="number-pad"
                />

                {/* בחירת מטרה */}
                <Text style={styles.label}>מטרת האימון</Text>
                <View style={styles.goalsGrid}>
                  {GOALS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.goalChip, goal === g && styles.goalChipActive]}
                      onPress={() => setGoal(g)}
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
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>הצטרפי עכשיו 🔥</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={handleRegister} disabled={loading}>
                  <Text style={styles.skipBtnText}>דלג - מלאי מאוחר יותר</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footer}>
            כבר יש לך חשבון?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
              כניסה
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// קומפוננטת שדה קלט
function InputField({ label, icon, rightIcon, onRightIconPress, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={{ marginLeft: 10 }}>
            <Ionicons name={rightIcon} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          textAlign="right"
          {...props}
        />
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, height: 52, paddingHorizontal: 14,
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
