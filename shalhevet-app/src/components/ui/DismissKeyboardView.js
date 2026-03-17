import React from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

export default function DismissKeyboardView({ children, style }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  );
}