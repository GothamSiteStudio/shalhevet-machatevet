import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import useStore from '../store/useStore';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import NutritionScreen from '../screens/NutritionScreen';
import CoachScreen from '../screens/CoachScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CoachDashboardScreen from '../screens/CoachDashboardScreen';
import FoodDiaryScreen from '../screens/FoodDiaryScreen';
import RecipeCatalogScreen from '../screens/RecipeCatalogScreen';
import AllInFitHubScreen from '../screens/AllInFitHubScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import WorkoutTrackerScreen from '../screens/WorkoutTrackerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CoachTab = createBottomTabNavigator();

function TabIcon({ name, library, focused, label }) {
  const IconComponent =
    library === 'material' ? MaterialCommunityIcons :
    library === 'fa5' ? FontAwesome5 : Ionicons;
  return (
    <View style={styles.tabItem}>
      <IconComponent
        name={name}
        size={22}
        color={focused ? COLORS.primary : COLORS.textMuted}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const tabNavScreenOptions = {
  headerShown: false,
  tabBarHideOnKeyboard: true,
  tabBarStyle: styles.tabBar,
  tabBarShowLabel: false,
};

// ─── טאבים למתאמנת ───────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabNavScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" library="ionicons" focused={focused} label="ראשי" />
          ),
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="barbell" library="ionicons" focused={focused} label="אימונים" />
          ),
        }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="nutrition" library="material" focused={focused} label="תזונה" />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-circle" library="ionicons" focused={focused} label="דף מאמן" />
          ),
        }}
      />
      <Tab.Screen
        name="AllInFit"
        component={AllInFitHubScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="sparkles" library="ionicons" focused={focused} label="All-in-Fit" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" library="ionicons" focused={focused} label="פרופיל" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── טאבים למאמנת: "שלהבת" (הדשבורד הקיים) + "All-in-Fit" ─────────
function CoachTabs() {
  return (
    <CoachTab.Navigator screenOptions={tabNavScreenOptions}>
      <CoachTab.Screen
        name="CoachHomeTab"
        component={CoachDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid" library="ionicons" focused={focused} label="שלהבת" />
          ),
        }}
      />
      <CoachTab.Screen
        name="CoachAllInFit"
        component={AllInFitHubScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="sparkles" library="ionicons" focused={focused} label="All-in-Fit" />
          ),
        }}
      />
    </CoachTab.Navigator>
  );
}

export default function AppNavigator() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const user = useStore((s) => s.user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user?.role === 'coach' ? (
        // מאמנת — לוח בקרה עם שתי קטגוריות
        <>
          <Stack.Screen name="CoachHome" component={CoachTabs} />
          <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
          <Stack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
        </>
      ) : (
        // מתאמנת — האפליקציה הרגילה + קטגוריית All-in-Fit
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="FoodDiary" component={FoodDiaryScreen} />
          <Stack.Screen name="RecipeCatalog" component={RecipeCatalogScreen} />
          <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
          <Stack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBar,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    justifyContent: 'center',
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});
