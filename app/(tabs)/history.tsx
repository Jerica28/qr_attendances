
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profile';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setStudentRecords([]);
      setTeacherEvents([]);
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole: Role | null = profile?.role ?? null;

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);
      } else if (currentRole === 'student') {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
      } else {
        setStudentRecords([]);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      setStudentRecords([]);
      setTeacherEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>History</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Loading attendance history...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>History</Text>
        <Text style={styles.subtitle}>Please sign in to view attendance history.</Text>
      </View>
    );
  }

  // TEACHER HISTORY
  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>History</Text>
        <Text style={styles.sectionTitle}>Attendance History</Text>

        {teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events yet. Create an event from the Teacher tab.
          </Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {item.attendeeCount}
                    </Text>
                  </View>
                </View>

                <Text style={styles.infoText}>
                  Event Code: {item.eventCode}
                </Text>

                {item.startTime ? (
                  <Text style={styles.infoText}>
                    Start: {formatDate(item.startTime)}
                  </Text>
                ) : null}

                {item.endTime ? (
                  <Text style={styles.infoText}>
                    End: {formatDate(item.endTime)}
                  </Text>
                ) : null}

                <Text style={styles.infoText}>
                  Total attendees: {item.attendeeCount}
                </Text>

                {item.attendees.length === 0 ? (
                  <Text style={styles.noAttendees}>
                    No students have scanned yet.
                  </Text>
                ) : (
                  <View style={styles.attendeeList}>
                    {item.attendees.map(
                      (attendee: TeacherEventAttendance['attendees'][number]) => (
                        <View
                          key={`${attendee.studentId}-${attendee.scannedAt}`}
                          style={styles.attendeeRow}
                        >
                          <Text style={styles.studentName}>
                            {attendee.studentName || 'Unknown Student'}
                          </Text>

                          <Text style={styles.scanTime}>
                            {' - '}
                            {formatDate(attendee.scannedAt)}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // STUDENT HISTORY
  if (role !== 'student') {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>History</Text>
        <Text style={styles.subtitle}>
          Your account role could not be verified. Please sign in again or contact your administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>History</Text>
      <Text style={styles.sectionTitle}>Attendance History</Text>

      {studentRecords.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {item.eventTitle}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>✓</Text>
                </View>
              </View>

              <Text style={styles.infoText}>
                Event Code: {item.eventId}
              </Text>

              <Text style={styles.infoText}>
                Attended: {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) {
    return 'Unknown date';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 24,
    paddingHorizontal: 15,
  },
  list: {
    paddingBottom: 30,
  },
  historyCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  eventTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#581C87',
    marginRight: 10,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 13,
    color: '#6B21A8',
    marginTop: 4,
    lineHeight: 19,
  },
  countBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  attendeeList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D8B4FE',
  },
  attendeeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 4,
    paddingBottom: 4,
  },
  studentName: {
    fontSize: 13,
    color: '#581C87',
    fontWeight: '600',
  },
  scanTime: {
    fontSize: 13,
    color: '#7E22CE',
  },
  noAttendees: {
    fontSize: 13,
    color: '#7E22CE',
    marginTop: 8,
  },
});
