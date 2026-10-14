import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getTeacherEventSummary,
  type TeacherEventSummary,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profile';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [events, setEvents] = useState<TeacherEventSummary[]>([]);

  const load = useCallback(async () => {
    if (!user) { setEvents([]); setRole(null); setLoading(false); return; }
    setLoading(true);
    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? 'student');
      if (profile?.role === 'teacher') {
        setEvents(await getTeacherEventSummary(user.id));
      } else setEvents([]);
    } catch (error) {
      console.error('Dashboard load failed:', error);
      setEvents([]);
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalEvents = events.length;
  const totalAttendance = events.reduce((sum, event) => sum + event.attendeeCount, 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /><Text style={styles.muted}>Loading statistics...</Text></View>;
  if (role !== 'teacher') return <View style={styles.center}><Text style={styles.title}>Teacher Dashboard</Text><Text style={styles.muted}>This dashboard is available to teacher accounts only.</Text></View>;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Attendance Dashboard</Text>
      <Text style={styles.muted}>Summary of the events you created.</Text>
      <View style={styles.cards}>
        <View style={styles.card}><Text style={styles.cardLabel}>Total Events</Text><Text style={styles.number}>{totalEvents}</Text></View>
        <View style={styles.card}><Text style={styles.cardLabel}>Attendance Records</Text><Text style={styles.number}>{totalAttendance}</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Event Summary</Text>
      {events.length === 0 ? <Text style={styles.empty}>No events yet. Create an event in the Teacher tab.</Text> : events.map((event) => (
        <View key={event.eventId} style={styles.eventCard}>
          <View style={styles.eventTop}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.count}>{event.attendeeCount} present</Text></View>
          <Text style={styles.muted}>Event code: {event.eventCode}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: COLORS.background },
  title: { fontSize: 25, fontWeight: '800', color: COLORS.textPrimary }, muted: { color: COLORS.textSecondary, fontSize: 14 },
  cards: { flexDirection: 'row', gap: 12, marginTop: 8 }, card: { flex: 1, backgroundColor: COLORS.card, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  cardLabel: { color: COLORS.textSecondary, fontSize: 13 }, number: { color: COLORS.primary, fontSize: 30, fontWeight: '800', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 10 }, eventCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, eventTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }, count: { color: COLORS.primary, fontWeight: '700' }, empty: { color: COLORS.textSecondary, paddingVertical: 12 },
});
