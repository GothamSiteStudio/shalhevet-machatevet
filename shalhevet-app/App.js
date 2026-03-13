import 'react-native-gesture-handler';
import './src/theme/configureTypography';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Heebo_400Regular, Heebo_500Medium, Heebo_700Bold } from '@expo-google-fonts/heebo';
import { I18nManager, StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

const APP_BACKGROUND_COLOR = '#111111';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar style="light" backgroundColor={APP_BACKGROUND_COLOR} translucent={false} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={APP_BACKGROUND_COLOR} translucent={false} />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: APP_BACKGROUND_COLOR,
    flex: 1,
  },
});
