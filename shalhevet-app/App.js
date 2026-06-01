import 'react-native-gesture-handler';
import './src/theme/configureTypography';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  Heebo_900Black,
} from '@expo-google-fonts/heebo';
import { Rubik_800ExtraBold, Rubik_900Black } from '@expo-google-fonts/rubik';
import { I18nManager, StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
import useStore from './src/store/useStore';
import { authAPI } from './src/services/api';

const APP_BACKGROUND_COLOR = '#111111';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Heebo_900Black,
    Rubik_800ExtraBold,
    Rubik_900Black,
  });

  const [authReady, setAuthReady] = useState(false);
  const restoreSession = useStore(s => s.login);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const { user } = await authAPI.me();
          if (mounted && user) restoreSession(user);
        }
      } catch (e) {
        // אין session תקף — מתחילים מנותקים
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [restoreSession]);

  if ((!fontsLoaded && !fontError) || !authReady) {
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
