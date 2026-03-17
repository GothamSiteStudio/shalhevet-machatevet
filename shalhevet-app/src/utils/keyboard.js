import { Platform } from 'react-native';

export const KEYBOARD_AVOIDING_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : undefined;

export const KEYBOARD_DISMISS_MODE = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

export const AUTOMATIC_KEYBOARD_INSETS = Platform.OS === 'ios';