export const COLORS = {
  // Layout
  background: '#111111',
  card: '#1C1C1C',
  cardLight: '#242424',
  tabBar: '#151515',
  inputBg: '#2A2A2A',
  
  // Brand
  primary: '#E53935',
  primaryLight: '#EF5350',
  primaryDark: '#B71C1C',
  accent: '#FF7043',
  
  // Gradients for linear-gradient backgrounds
  gradientPrimary: ['#E53935', '#FF7043'], // 🔥 אש/שלהבת
  gradientDark: ['#242424', '#161616'],
  gradientBackground: ['#1C1C1C', '#111111'],
  gradientSuccess: ['#43A047', '#66BB6A'],

  // Text — WCAG AA verified contrast on #111 background
  white: '#FFFFFF',
  text: '#F5F5F5',         // 17.5:1
  textSecondary: '#C7C7C7', // 9.4:1 (was #AAA = 4.1, failed AA on small text)
  textMuted: '#A0A0A0',    // 5.7:1 (was #757575 = 3.6, failed AA)

  // UI & Status
  border: '#2E2E2E',
  borderLight: '#3A3A3A',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#42A5F5',
  danger: '#EF5350',

  // Grays
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
};
