import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getTeacherEventAttendance, type TeacherEventAttendance } from '@/lib/attendance';
import { getProfile } from '@/lib/profile';
import { exportEventAttendanceCsv } from '@/lib/report';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TeacherEventAttendance[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setRole(null); setEvents([]); setLoading(false); return; }
    setLoading(true);
    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? 'student');
      setEvents(profile?.role === 'teacher' ? await getTeacherEventAttendance(user.id) : []);
    } catch (error) { console.error('Could not load reports:', error); setEvents([]); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exportOne = async (event: TeacherEventAttendance) => {
    setExportingId(event.eventId);
    try {
      await exportEventAttendanceCsv(event);
    } catch (error) {
      console.error(error);
      Alert.alert('Export failed', 'Could not export this report. Please try again.');
    } finally { setExportingId(null); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /><Text style={styles.muted}>Loading reports...</Text></View>;
  if (role !== 'teacher') return <View style={styles.center}><Text style={styles.title}>Teacher Reports</Text><Text style={styles.muted}>Only teacher accounts can access attendance reports.</Text></View>;

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Attendance Reports</Text>
    <Text style={styles.muted}>Export an event's attendance list as a CSV file.</Text>
    {events.length === 0 ? <Text style={styles.empty}>No events or attendance records found.</Text> : events.map((event) => (
      <View key={event.eventId} style={styles.card}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.muted}>Code: {event.eventCode}</Text>
        <Text style={styles.count}>{event.attendeeCount} attendance record(s)</Text>
        <Pressable disabled={exportingId !== null} onPress={() => exportOne(event)} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }, exportingId !== null && { opacity: 0.6 }]}>
          <Text style={styles.buttonText}>{exportingId === event.eventId ? 'Preparing CSV...' : 'Export CSV'}</Text>
        </Pressable>
      </View>
    ))}
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 20, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: COLORS.background }, title: { fontSize: 25, fontWeight: '800', color: COLORS.textPrimary }, muted: { color: COLORS.textSecondary, fontSize: 14 }, card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 }, eventTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary }, count: { color: COLORS.primary, fontWeight: '700' }, button: { backgroundColor: COLORS.primary, padding: 13, borderRadius: 10, alignItems: 'center', marginTop: 4 }, buttonText: { color: '#FFFFFF', fontWeight: '700' }, empty: { color: COLORS.textSecondary, paddingVertical: 12 } });
