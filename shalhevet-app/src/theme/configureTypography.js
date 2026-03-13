import { StyleSheet, Text, TextInput } from 'react-native';
import { DEFAULT_MAX_FONT_SIZE_MULTIPLIER, mapTypographyStyles } from './typography';

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
}
