import React from 'react';
import { Keyboard, View } from 'react-native';

export default function DismissKeyboardView({ children, style }) {
  return (
    <View
      style={style}
      onStartShouldSetResponder={() => {
        Keyboard.dismiss();
        return false;
      }}
    >
      {children}
    </View>
  );
}