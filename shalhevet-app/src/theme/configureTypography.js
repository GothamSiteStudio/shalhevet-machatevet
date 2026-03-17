import { FlatList, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { DEFAULT_MAX_FONT_SIZE_MULTIPLIER, mapTypographyStyles } from './typography';
import { AUTOMATIC_KEYBOARD_INSETS, KEYBOARD_DISMISS_MODE } from '../utils/keyboard';

const globalScope = globalThis;

if (!globalScope.__shalhevetTypographyConfigured) {
  globalScope.__shalhevetTypographyConfigured = true;

  const originalCreate = StyleSheet.create.bind(StyleSheet);

  StyleSheet.create = styles => originalCreate(mapTypographyStyles(styles));

  Text.defaultProps = {
    ...(Text.defaultProps || {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  };

  TextInput.defaultProps = {
    ...(TextInput.defaultProps || {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  };

  ScrollView.defaultProps = {
    ...(ScrollView.defaultProps || {}),
    automaticallyAdjustKeyboardInsets: AUTOMATIC_KEYBOARD_INSETS,
    keyboardDismissMode: KEYBOARD_DISMISS_MODE,
    keyboardShouldPersistTaps: 'handled',
  };

  FlatList.defaultProps = {
    ...(FlatList.defaultProps || {}),
    automaticallyAdjustKeyboardInsets: AUTOMATIC_KEYBOARD_INSETS,
    keyboardDismissMode: KEYBOARD_DISMISS_MODE,
    keyboardShouldPersistTaps: 'handled',
  };
}
