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
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { coachAPI } from '../services/api';
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
  const initials = client.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.clientInfo}>
        <View>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
          {client.goal && <Text style={styles.clientGoal}>🎯 {client.goal}</Text>}
        </View>
        <View style={styles.clientMeta}>
          {client.weight && (
            <Text style={styles.clientWeight}>{client.weight} ק"ג</Text>
          )}
          <View style={[styles.clientStatus, { backgroundColor: client.isActive ? '#2E7D3233' : '#B71C1C33' }]}>
            <Text style={[styles.clientStatusText, { color: client.isActive ? '#4CAF50' : '#F44336' }]}>
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
      const result = await coachAPI.addClient({ name, email, password, phone });
      Alert.alert('✅ נוסף!', `${name} נוספה למערכת`);
      setName(''); setEmail(''); setPassword(''); setPhone('');
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>הוספת לקוחה חדשה</Text>
          <Text style={styles.modalSub}>המאמנת פותחת חשבון ישירות</Text>

          {[
            { label: 'שם מלא *', value: name, setter: setName, placeholder: 'שם פרטי ומשפחה' },
            { label: 'אימייל *', value: email, setter: setEmail, placeholder: 'email@gmail.com', keyboard: 'email-address' },
            { label: 'סיסמה זמנית *', value: password, setter: setPassword, placeholder: 'לפחות 6 תווים', secure: true },
            { label: 'טלפון', value: phone, setter: setPhone, placeholder: '050-0000000', keyboard: 'phone-pad' },
          ].map((field) => (
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
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>הוספה</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── לוח בקרה ראשי ──────────────────────────────────────────────────────────
export default function CoachDashboardScreen() {
  const logout = useStore((s) => s.logout);
  const user = useStore((s) => s.user);

  const [activeTab, setActiveTab] = useState('clients'); // clients | updates | meetings
  const [clients, setClients] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    } catch (err) {
      Alert.alert('שגיאה בטעינה', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleMeetingStatus = async (meetingId, status) => {
    try {
      await coachAPI.updateMeeting(meetingId, status);
      Alert.alert('✅', `פגישה ${status === 'אושר' ? 'אושרה' : 'נדחתה'}`);
      loadData();
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.includes(searchQuery) || c.email.includes(searchQuery)
  );

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
        <TouchableOpacity onPress={() => Alert.alert('יציאה', 'האם לצאת?', [
          { text: 'ביטול' },
          { text: 'יציאה', style: 'destructive', onPress: logout },
        ])}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard value={stats.totalClients} label="לקוחות" icon="people-outline" color={COLORS.primary} />
            <StatCard value={stats.pendingMeetings} label="פגישות ממתינות" icon="calendar-outline" color="#FFA726" />
            <StatCard value={stats.unreadUpdates} label="עדכונים חדשים" icon="mail-unread-outline" color="#42A5F5" />
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { id: 'clients', label: `לקוחות (${clients.length})`, icon: 'people' },
            { id: 'updates', label: `עדכונים (${updates.length})`, icon: 'newspaper' },
            { id: 'meetings', label: `פגישות (${meetings.length})`, icon: 'calendar' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                size={16} color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted} />
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
                <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
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
                filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onPress={() => Alert.alert(client.name, `אימייל: ${client.email}\nטלפון: ${client.phone || 'לא הוזן'}\nמשקל: ${client.weight || '?'} ק"ג\nגובה: ${client.height || '?'} ס"מ\nמטרה: ${client.goal || '?'}`)}
                  />
                ))
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
                updates.map((update) => (
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
                meetings.map((meeting) => (
                  <View key={meeting.id} style={styles.meetingCard}>
                    <View style={styles.meetingHeader}>
                      <View style={[styles.meetingBadge, {
                        backgroundColor: meeting.status === 'אושר' ? '#2E7D3233' :
                          meeting.status === 'נדחה' ? '#B71C1C33' : '#E65100' + '33'
                      }]}>
                        <Text style={[styles.meetingBadgeText, {
                          color: meeting.status === 'אושר' ? '#4CAF50' :
                            meeting.status === 'נדחה' ? '#F44336' : '#FFA726'
                        }]}>{meeting.status}</Text>
                      </View>
                      <Text style={styles.meetingClient}>{meeting.clientName}</Text>
                    </View>
                    <Text style={styles.meetingDate}>📅 {meeting.requestedDate}</Text>
                    {meeting.notes ? <Text style={styles.meetingNotes}>{meeting.notes}</Text> : null}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: COLORS.primary, fontSize: 12 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row', gap: 10, padding: 16,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    marginHorizontal: 16, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary + '22' },
  tabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, height: 44,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14, paddingHorizontal: 12, textAlign: 'right' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  clientCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  clientAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  clientAvatarText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  clientInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { color: COLORS.white, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  clientEmail: { color: COLORS.textMuted, fontSize: 12, textAlign: 'right' },
  clientGoal: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'right' },
  clientMeta: { alignItems: 'flex-start', gap: 4 },
  clientWeight: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  clientStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  clientStatusText: { fontSize: 10, fontWeight: '600' },

  updateCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  updateClient: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  updateDate: { color: COLORS.textMuted, fontSize: 12 },
  updateText: { color: COLORS.white, fontSize: 14, lineHeight: 20, textAlign: 'right' },

  meetingCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meetingClient: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  meetingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  meetingBadgeText: { fontSize: 11, fontWeight: '700' },
  meetingDate: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 4 },
  meetingNotes: { color: COLORS.textMuted, fontSize: 12, textAlign: 'right', marginBottom: 8 },
  meetingActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  meetingBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#2E7D32' },
  rejectBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#B71C1C' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtnText: { color: '#F44336', fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  modalSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12,
    color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, textAlign: 'right',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  submitBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.primary },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
});
