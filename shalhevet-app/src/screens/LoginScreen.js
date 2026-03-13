import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';
import { authAPI, tokenStorage } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useStore(s => s.login);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      const result = await authAPI.login(email, password);
      await tokenStorage.save(result.token);
      login(result.user);
    } catch (err) {
      Alert.alert('שגיאת כניסה', err.message || 'אימייל או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    tokenStorage.remove().finally(() => {
      login({
        id: 'demo-user',
        email: 'demo@shalhevet.com',
        name: 'דמו - שלהבת',
        role: 'client',
        goal: 'חיטוב',
        weight: 65,
        coachName: 'שלהבת מחטבת',
      });
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo - decorative, hidden from screen readers */}
          <View
            style={styles.logoContainer}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessible={false}
            />
          </View>

          <Text style={styles.title} accessible={true} accessibilityRole="header">
            שלהבת מחטבת
          </Text>
          <Text style={styles.subtitle} accessible={true} accessibilityLabel="ברוכה הבאה">
            ברוכה הבאה! 💪
          </Text>
          <Text style={styles.subsubtitle} accessible={true}>
            מאמנת כושר אישית לנשים
          </Text>

          {/* Form */}
          <View style={styles.form} accessible={false}>
            <Text style={styles.formLabel} accessibilityRole="header" accessible={true}>
              כניסה לאפליקציה
            </Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
                accessible={false}
              />
              <TextInput
                style={styles.input}
                placeholder="אימייל"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                textAlign="right"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessible={true}
                accessibilityLabel="שדה אימייל"
                accessibilityHint="הזיני את כתובת האימייל שלך"
                accessibilityRole="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.inputIcon}
                accessible={true}
                accessibilityLabel={showPass ? 'הסתר סיסמה' : 'הצג סיסמה'}
                accessibilityRole="button"
                accessibilityState={{ expanded: showPass }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPass ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                  accessible={false}
                />
              </TouchableOpacity>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="סיסמה"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                textContentType="password"
                autoComplete="password"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessible={true}
                accessibilityLabel="שדה סיסמה"
                accessibilityHint="הזיני את הסיסמה שלך"
                accessibilityRole="none"
              />
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              accessible={true}
              accessibilityLabel="שכחתי סיסמה - לחצי לקבלת עזרה"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>שכחתי סיסמה</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
              accessible={true}
              accessibilityLabel="כניסה לאפליקציה"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              accessibilityHint="לחצי לכניסה לחשבונך"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} accessible={false} />
              ) : (
                <Text style={styles.loginBtnText}>כניסה</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={styles.divider}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>או</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Demo Button */}
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemo}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="כניסה לדמו ללא הרשמה"
              accessibilityRole="button"
              accessibilityHint="כניסה לגרסת ניסיון של האפליקציה"
            >
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={COLORS.primary}
                accessible={false}
              />
              <Text style={styles.demoBtnText}>כניסה לדמו (ללא הרשמה)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer} accessible={true}>
            אין לך חשבון?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="link"
              accessible={true}
              accessibilityLabel="הירשמי עכשיו - מעבר לדף ההרשמה"
            >
              הירשמי עכשיו
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  subsubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 2,
  },
  form: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: {
    marginLeft: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    textAlign: 'right',
    minHeight: 44,
    paddingVertical: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 12,
    fontSize: 13,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 52,
    gap: 8,
  },
  demoBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
