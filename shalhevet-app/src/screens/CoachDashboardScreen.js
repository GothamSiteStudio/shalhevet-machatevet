/**
 * CoachDashboardScreen.js - לוח הבקרה של שלהבת המאמנת
 * ========================================================
 * רק שלהבת רואה את המסך הזה (role === 'coach')
 *
 * מה יש כאן:
 * 1. סטטיסטיקות כלליות
 * 2. רשימת כל הלקוחות
 * 3. עדכונים חדשים
 * 4. בקשות פגישות
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { coachAPI } from '../services/api';
import { CATALOG_MEAL_SOURCE, mergeRecipeCatalogWithCoachMeals } from '../data/recipeCatalog';
import CoachClientPlansModal from '../components/CoachClientPlansModal';
import useStore from '../store/useStore';

// ─── קומפוננטת כרטיס סטטיסטיקה ────────────────────────────────────────────
function StatCard({ value, label, icon, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── קומפוננטת כרטיס לקוחה ──────────────────────────────────────────────────
function ClientCard({ client, onPress }) {
  const initials = client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2);
  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.clientInfo}>
        <View>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
          {client.goal && <Text style={styles.clientGoal}>🎯 {client.goal}</Text>}
          <Text style={styles.clientActionHint}>לחצי לעריכת חשבון, יעדים, תפריט ויומן אכילה</Text>
        </View>
        <View style={styles.clientMeta}>
          {client.weight && <Text style={styles.clientWeight}>{`${client.weight} ק״ג`}</Text>}
          <View
            style={[
              styles.clientStatus,
              { backgroundColor: client.isActive ? '#2E7D3233' : '#B71C1C33' },
            ]}
          >
            <Text
              style={[styles.clientStatusText, { color: client.isActive ? '#4CAF50' : '#F44336' }]}
            >
              {client.isActive ? 'פעילה' : 'לא פעילה'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>{initials}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── מודל הוספת לקוחה ────────────────────────────────────────────────────────
function AddClientModal({ visible, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name || !email || !password) {
      Alert.alert('שגיאה', 'שם, אימייל וסיסמה הם שדות חובה');
      return;
    }
    setLoading(true);
    try {
      await coachAPI.addClient({ name, email, password, phone });
      Alert.alert('✅ נוסף!', `${name} נוספה למערכת`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      onAdded();
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>הוספת לקוחה חדשה</Text>
          <Text style={styles.modalSub}>המאמנת פותחת חשבון ישירות</Text>

          {[
            { label: 'שם מלא *', value: name, setter: setName, placeholder: 'שם פרטי ומשפחה' },
            {
              label: 'אימייל *',
              value: email,
              setter: setEmail,
              placeholder: 'email@gmail.com',
              keyboard: 'email-address',
            },
            {
              label: 'סיסמה זמנית *',
              value: password,
              setter: setPassword,
              placeholder: 'לפחות 6 תווים',
              secure: true,
            },
            {
              label: 'טלפון',
              value: phone,
              setter: setPhone,
              placeholder: '050-0000000',
              keyboard: 'phone-pad',
            },
          ].map(field => (
            <View key={field.label} style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textMuted}
                keyboardType={field.keyboard || 'default'}
                secureTextEntry={field.secure}
                textAlign="right"
                autoCapitalize="none"
              />
            </View>
          ))}

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>הוספה</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── קטגוריות ארוחות ─────────────────────────────────────────────────────────
const MEAL_CATEGORIES = [
  'ארוחת בוקר',
  'ארוחת ביניים',
  'ארוחת צהריים',
  'ארוחת ערב',
  'נשנוש',
  'מתוק',
  'כללי',
];

// ─── מודל עריכת ארוחה למאגר ─────────────────────────────────────────────────
function CoachMealEditorModal({ visible, onClose, onSaved, editMeal }) {
  const isEditing = !!editMeal;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('כללי');
  const [description, setDescription] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && editMeal) {
      setTitle(editMeal.title || '');
      setCategory(editMeal.category || 'כללי');
      setDescription(editMeal.description || '');
      setPortion(editMeal.portion || '');
      setCalories(editMeal.calories != null ? String(editMeal.calories) : '');
      setProtein(editMeal.protein != null ? String(editMeal.protein) : '');
      setCarbs(editMeal.carbs != null ? String(editMeal.carbs) : '');
      setFat(editMeal.fat != null ? String(editMeal.fat) : '');
      setIngredients(Array.isArray(editMeal.ingredients) ? editMeal.ingredients.join('\n') : '');
      setInstructions(Array.isArray(editMeal.instructions) ? editMeal.instructions.join('\n') : '');
    } else if (visible) {
      setTitle('');
      setCategory('כללי');
      setDescription('');
      setPortion('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setIngredients('');
      setInstructions('');
    }
  }, [visible, editMeal]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'שם הארוחה הוא שדה חובה');
      return;
    }
    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        category,
        description: description.trim(),
        portion: portion.trim(),
        calories: calories ? Number(calories) : null,
        protein: protein ? Number(protein) : null,
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        ingredients: ingredients.trim() ? ingredients.trim().split('\n').filter(Boolean) : [],
        instructions: instructions.trim() ? instructions.trim().split('\n').filter(Boolean) : [],
        items: [
          {
            id: `item-${Date.now()}`,
            name: title.trim(),
            amount: portion.trim() || '',
            imageUrl: '',
            calories: calories ? Number(calories) : 0,
            protein: protein ? Number(protein) : 0,
            carbs: carbs ? Number(carbs) : 0,
            fat: fat ? Number(fat) : 0,
            notes: description.trim(),
          },
        ],
      };

      if (isEditing) {
        await coachAPI.updateMeal(editMeal.id, data);
        Alert.alert('✅ עודכן', `${data.title} עודכנה במאגר`);
      } else {
        await coachAPI.createMeal(data);
        Alert.alert('✅ נוסף', `${data.title} נוספה למאגר`);
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{isEditing ? 'עריכת ארוחה' : 'ארוחה חדשה למאגר'}</Text>
          <Text style={styles.modalSub}>הארוחה תישמר במאגר ותוכלי להוסיף אותה ללקוחות</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>שם הארוחה *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="לדוגמה: סלט קינואה עם ירקות צלויים"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>קטגוריה</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 4 }}
              >
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  {MEAL_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[styles.catChip, category === cat && styles.catChipActive]}
                    >
                      <Text
                        style={[styles.catChipText, category === cat && styles.catChipTextActive]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>תיאור</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="תיאור קצר של הארוחה"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>גודל מנה</Text>
              <TextInput
                style={styles.input}
                value={portion}
                onChangeText={setPortion}
                placeholder="100 גרם / כוס / יחידה"
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>קלוריות</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="350"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>חלבון (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="25"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>פחמימות (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="40"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>שומן (ג׳)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="12"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>מצרכים (שורה לכל מצרך)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={ingredients}
                onChangeText={setIngredients}
                placeholder={'כוס קינואה\n2 עגבניות\nכפית שמן זית'}
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>הוראות הכנה (שורה לכל שלב)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder={'מבשלים את הקינואה\nחותכים ירקות\nמערבבים הכל'}
                placeholderTextColor={COLORS.textMuted}
                textAlign="right"
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>{isEditing ? 'עדכון' : 'הוספה'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── לוח בקרה ראשי ──────────────────────────────────────────────────────────
export default function CoachDashboardScreen() {
  const logout = useStore(s => s.logout);

  const [activeTab, setActiveTab] = useState('clients'); // clients | updates | meetings | meals
  const [clients, setClients] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientPlansModal, setShowClientPlansModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // מאגר ארוחות
  const [coachMeals, setCoachMeals] = useState([]);
  const [showMealEditor, setShowMealEditor] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealSearchQuery, setMealSearchQuery] = useState('');
  const [activeMealCategory, setActiveMealCategory] = useState('הכל');

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, updatesRes, meetingsRes, statsRes] = await Promise.all([
        coachAPI.getClients(),
        coachAPI.getUpdates(),
        coachAPI.getMeetings(),
        coachAPI.getStats(),
      ]);
      setClients(clientsRes.clients || []);
      setUpdates(updatesRes.updates || []);
      setMeetings(meetingsRes.meetings || []);
      setStats(statsRes.stats || null);

      // טעינת מאגר ארוחות - לא מפיל את שאר הטעינה אם נכשל
      try {
        const mealsRes = await coachAPI.getMeals();
        setCoachMeals(mealsRes.meals || []);
      } catch {
        setCoachMeals([]);
      }
    } catch (err) {
      Alert.alert('שגיאה בטעינה', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMeetingStatus = async (meetingId, status) => {
    try {
      await coachAPI.updateMeeting(meetingId, status);
      Alert.alert('✅', `פגישה ${status === 'אושר' ? 'אושרה' : 'נדחתה'}`);
      loadData();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const filteredClients = clients.filter(
    c => c.name.includes(searchQuery) || c.email.includes(searchQuery)
  );

  const openClientModal = clientId => {
    setSelectedClientId(clientId);
    setShowClientPlansModal(true);
  };

  const closeClientModal = () => {
    setShowClientPlansModal(false);
    setSelectedClientId(null);
  };

  const handleDeleteMeal = mealId => {
    const meal = coachMeals.find(m => m.id === mealId);
    Alert.alert('מחיקת ארוחה', `למחוק את "${meal?.title}" מהמאגר?`, [
      { text: 'ביטול' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          try {
            await coachAPI.deleteMeal(mealId);
            loadData();
          } catch (err) {
            Alert.alert('שגיאה', err.message);
          }
        },
      },
    ]);
  };

  const openMealEditor = (meal = null) => {
    setEditingMeal(meal);
    setShowMealEditor(true);
  };

  const closeMealEditor = () => {
    setShowMealEditor(false);
    setEditingMeal(null);
  };

  const mealLibrary = mergeRecipeCatalogWithCoachMeals(coachMeals);

  const mealCategoryList = ['הכל', ...new Set(mealLibrary.map(m => m.category).filter(Boolean))];

  const filteredMeals = mealLibrary.filter(meal => {
    const matchesCategory = activeMealCategory === 'הכל' || meal.category === activeMealCategory;
    const query = mealSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      meal.title.toLowerCase().includes(query) ||
      (meal.description || '').toLowerCase().includes(query) ||
      (meal.category || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('יציאה', 'האם לצאת?', [
              { text: 'ביטול' },
              { text: 'יציאה', style: 'destructive', onPress: logout },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>לוח בקרה</Text>
          <Text style={styles.headerSub}>שלהבת מחטבת 🔥</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard
              value={stats.totalClients}
              label="לקוחות"
              icon="people-outline"
              color={COLORS.primary}
            />
            <StatCard
              value={stats.pendingMeetings}
              label="פגישות ממתינות"
              icon="calendar-outline"
              color="#FFA726"
            />
            <StatCard
              value={stats.unreadUpdates}
              label="עדכונים חדשים"
              icon="mail-unread-outline"
              color="#42A5F5"
            />
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { id: 'clients', label: `לקוחות (${clients.length})`, icon: 'people' },
            { id: 'meals', label: `מאגר (${mealLibrary.length})`, icon: 'restaurant' },
            { id: 'updates', label: `עדכונים (${updates.length})`, icon: 'newspaper' },
            { id: 'meetings', label: `פגישות (${meetings.length})`, icon: 'calendar' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                size={16}
                color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {/* ─── טאב לקוחות ─── */}
          {activeTab === 'clients' && (
            <>
              {/* חיפוש */}
              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפשי לקוחה לפי שם או אימייל..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  textAlign="right"
                />
              </View>

              {filteredClients.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>אין לקוחות עדיין</Text>
                  <Text style={styles.emptyText}>לחצי על + למעלה להוספת לקוחה חדשה</Text>
                </View>
              ) : (
                filteredClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onPress={() => openClientModal(client.id)}
                  />
                ))
              )}
            </>
          )}

          {/* ─── טאב מאגר ארוחות ─── */}
          {activeTab === 'meals' && (
            <>
              {/* חיפוש */}
              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפשי ארוחה לפי שם או תיאור..."
                  placeholderTextColor={COLORS.textMuted}
                  value={mealSearchQuery}
                  onChangeText={setMealSearchQuery}
                  textAlign="right"
                />
              </View>

              {/* קטגוריות */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  {mealCategoryList.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setActiveMealCategory(cat)}
                      style={[styles.catChip, activeMealCategory === cat && styles.catChipActive]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          activeMealCategory === cat && styles.catChipTextActive,
                        ]}
                      >
                        {cat} (
                        {cat === 'הכל'
                          ? mealLibrary.length
                          : mealLibrary.filter(m => m.category === cat).length}
                        )
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* כפתור הוספה */}
              <TouchableOpacity style={styles.addMealBtn} onPress={() => openMealEditor()}>
                <Text style={styles.addMealBtnText}>הוסיפי ארוחה למאגר</Text>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {filteredMeals.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {mealLibrary.length === 0 ? 'המאגר ריק' : 'אין תוצאות'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {mealLibrary.length === 0
                      ? 'הוסיפי ארוחות ומתכונים שתוכלי לשבץ ללקוחות'
                      : 'נסי לשנות את החיפוש או הקטגוריה'}
                  </Text>
                </View>
              ) : (
                filteredMeals.map(meal => {
                  const isCatalogMeal = meal.source === CATALOG_MEAL_SOURCE;

                  return (
                    <View key={meal.id} style={styles.mealCard}>
                      <View style={styles.mealCardHeader}>
                        <View style={styles.mealCalPill}>
                          <Text style={styles.mealCalPillText}>
                            {meal.calories ? `${meal.calories} קל׳` : '—'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mealCardTitle}>{meal.title}</Text>
                          <Text style={styles.mealCardMeta}>
                            {meal.category}
                            {meal.portion ? ` · ${meal.portion}` : ''}
                          </Text>
                        </View>
                      </View>

                      {meal.description ? (
                        <Text style={styles.mealCardDesc} numberOfLines={2}>
                          {meal.description}
                        </Text>
                      ) : null}

                      {/* מאקרו */}
                      <View style={styles.mealMacros}>
                        {meal.protein != null && (
                          <Text style={styles.mealMacroText}>ח׳ {meal.protein}ג׳</Text>
                        )}
                        {meal.carbs != null && (
                          <Text style={styles.mealMacroText}>פ׳ {meal.carbs}ג׳</Text>
                        )}
                        {meal.fat != null && (
                          <Text style={styles.mealMacroText}>ש׳ {meal.fat}ג׳</Text>
                        )}
                      </View>

                      {isCatalogMeal ? (
                        <View style={styles.builtInMealBadge}>
                          <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.builtInMealBadgeText}>מתכון מובנה מהספרייה</Text>
                        </View>
                      ) : (
                        <View style={styles.mealCardActions}>
                          <TouchableOpacity
                            onPress={() => handleDeleteMeal(meal.id)}
                            style={styles.mealSecondaryBtn}
                          >
                            <Ionicons name="trash-outline" size={16} color="#F44336" />
                            <Text style={[styles.mealSecondaryBtnText, { color: '#F44336' }]}>
                              מחיקה
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openMealEditor(meal)}
                            style={styles.mealPrimaryBtn}
                          >
                            <Ionicons name="create-outline" size={16} color={COLORS.white} />
                            <Text style={styles.mealPrimaryBtnText}>עריכה</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ─── טאב עדכונים ─── */}
          {activeTab === 'updates' && (
            <>
              {updates.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>אין עדכונים עדיין</Text>
                  <Text style={styles.emptyText}>הלקוחות ישלחו עדכונים שבועיים מהאפליקציה</Text>
                </View>
              ) : (
                updates.map(update => (
                  <View key={update.id} style={styles.updateCard}>
                    <View style={styles.updateHeader}>
                      <Text style={styles.updateDate}>{update.date}</Text>
                      <Text style={styles.updateClient}>{update.clientName}</Text>
                    </View>
                    <Text style={styles.updateText}>{update.text}</Text>
                  </View>
                ))
              )}
            </>
          )}

          {/* ─── טאב פגישות ─── */}
          {activeTab === 'meetings' && (
            <>
              {meetings.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>אין בקשות פגישות</Text>
                  <Text style={styles.emptyText}>הלקוחות יכולות לבקש פגישה מהאפליקציה</Text>
                </View>
              ) : (
                meetings.map(meeting => (
                  <View key={meeting.id} style={styles.meetingCard}>
                    <View style={styles.meetingHeader}>
                      <View
                        style={[
                          styles.meetingBadge,
                          {
                            backgroundColor:
                              meeting.status === 'אושר'
                                ? '#2E7D3233'
                                : meeting.status === 'נדחה'
                                  ? '#B71C1C33'
                                  : '#E65100' + '33',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.meetingBadgeText,
                            {
                              color:
                                meeting.status === 'אושר'
                                  ? '#4CAF50'
                                  : meeting.status === 'נדחה'
                                    ? '#F44336'
                                    : '#FFA726',
                            },
                          ]}
                        >
                          {meeting.status}
                        </Text>
                      </View>
                      <Text style={styles.meetingClient}>{meeting.clientName}</Text>
                    </View>
                    <Text style={styles.meetingDate}>📅 {meeting.requestedDate}</Text>
                    {meeting.notes ? (
                      <Text style={styles.meetingNotes}>{meeting.notes}</Text>
                    ) : null}

                    {meeting.status === 'ממתין לאישור' && (
                      <View style={styles.meetingActions}>
                        <TouchableOpacity
                          style={[styles.meetingBtn, styles.rejectBtn]}
                          onPress={() => handleMeetingStatus(meeting.id, 'נדחה')}
                        >
                          <Text style={styles.rejectBtnText}>דחייה</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.meetingBtn, styles.approveBtn]}
                          onPress={() => handleMeetingStatus(meeting.id, 'אושר')}
                        >
                          <Text style={styles.approveBtnText}>אישור ✓</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={loadData}
      />

      <CoachClientPlansModal
        visible={showClientPlansModal}
        clientId={selectedClientId}
        onClose={closeClientModal}
        onSaved={loadData}
      />

      <CoachMealEditorModal
        visible={showMealEditor}
        onClose={closeMealEditor}
        onSaved={loadData}
        editMeal={editingMeal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '22',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  approveBtn: { backgroundColor: '#2E7D32' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  cancelBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  clientActionHint: { color: COLORS.primary, fontSize: 11, marginTop: 6, textAlign: 'right' },
  clientAvatar: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '33',
    borderRadius: 23,
    flexShrink: 0,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  clientAvatarText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },

  clientCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  clientEmail: { color: COLORS.textMuted, fontSize: 12, textAlign: 'right' },
  clientGoal: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'right' },
  clientInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  clientMeta: { alignItems: 'flex-start', gap: 4 },
  clientName: { color: COLORS.white, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  clientStatus: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  clientStatusText: { fontSize: 10, fontWeight: '600' },
  clientWeight: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  content: { paddingBottom: 32, paddingHorizontal: 16 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4, textAlign: 'right' },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerCenter: { alignItems: 'center' },
  headerSub: { color: COLORS.primary, fontSize: 12 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 14,
    padding: 12,
    textAlign: 'right',
  },
  loadingContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  meetingActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  meetingBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  meetingBadgeText: { fontSize: 11, fontWeight: '700' },
  meetingBtn: { alignItems: 'center', borderRadius: 10, flex: 1, paddingVertical: 10 },
  meetingCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  meetingClient: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  meetingDate: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4, textAlign: 'right' },
  meetingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meetingNotes: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8, textAlign: 'right' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 2,
    height: 4,
    marginBottom: 20,
    width: 40,
  },

  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.7)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    flexShrink: 1,
    maxHeight: '88%',
  },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  rejectBtn: { backgroundColor: COLORS.card, borderColor: '#B71C1C', borderWidth: 1 },
  rejectBtnText: { color: '#F44336', fontSize: 14, fontWeight: '600' },
  safe: { backgroundColor: COLORS.background, flex: 1 },
  searchInput: {
    color: COLORS.white,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    textAlign: 'right',
  },
  searchWrapper: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    marginBottom: 12,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  statLabel: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },

  submitBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 2,
    paddingVertical: 14,
  },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: COLORS.primary + '22' },
  tabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabs: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 4,
  },
  updateCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  updateClient: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  updateDate: { color: COLORS.textMuted, fontSize: 12 },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  updateText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },

  // ─── סגנונות מאגר ארוחות ───
  catChip: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: COLORS.primary + '22',
    borderColor: COLORS.primary,
  },
  catChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  addMealBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '44',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
    paddingVertical: 12,
  },
  addMealBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  mealCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  mealCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  mealCardTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  mealCardMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  mealCardDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
    textAlign: 'right',
  },
  mealCalPill: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mealCalPillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  mealMacros: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 8,
  },
  mealMacroText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  mealCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  builtInMealBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '14',
    borderColor: COLORS.primary + '33',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  builtInMealBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  mealSecondaryBtn: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mealSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealPrimaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mealPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
