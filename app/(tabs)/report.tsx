
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profile';
import { exportEventAttendanceCsv } from '@/lib/report';

type ReportPeriod = 'month' | 'all';

export default function ReportsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TeacherEventAttendance[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>(
    {}
  );
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setEvents([]);
      setStudentNames({});
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? 'student');

      if (profile?.role !== 'teacher') {
        setEvents([]);
        setStudentNames({});
        return;
      }

      const result = await getTeacherEventAttendance(user.id);
      setEvents(result);

      // Get the unique profile IDs of everyone who attended.
      const studentIds = [
        ...new Set(
          result.flatMap((event) =>
            event.attendees.map((attendee) => attendee.studentId)
          )
        ),
      ];

      if (studentIds.length === 0) {
        setStudentNames({});
        return;
      }

      // Look up names without changing the actual attendance IDs.
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      if (profilesError) {
        console.error('Could not load attendee names:', profilesError);
        setStudentNames({});
      } else {
        const names: Record<string, string> = {};

        for (const item of profiles ?? []) {
          if (item.full_name?.trim()) {
            names[item.id] = item.full_name.trim();
          }
        }

        setStudentNames(names);
      }
    } catch (error) {
      console.error('Could not load reports:', error);
      setEvents([]);
      setStudentNames({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filteredEvents = useMemo(() => {
    if (period === 'all') {
      return events;
    }

    const now = new Date();

    return events
      .map((event) => ({
        ...event,
        attendees: event.attendees.filter((attendee) => {
          const date = new Date(attendee.scannedAt);

          return (
            !Number.isNaN(date.getTime()) &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }),
      }))
      .filter((event) => event.attendees.length > 0);
  }, [events, period]);

  const totalAttendance = filteredEvents.reduce(
    (sum, event) => sum + event.attendees.length,
    0
  );

  const totalEvents = filteredEvents.length;

  const exportOne = async (event: TeacherEventAttendance) => {
    setExportingId(event.eventId);

    try {
      await exportEventAttendanceCsv(event);
    } catch (error) {
      console.error('Report export failed:', error);
      Alert.alert(
        'Export failed',
        'Could not export this report. Please try again.'
      );
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading attendance reports...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.center}>
        <Ionicons
          name="document-text-outline"
          size={48}
          color={COLORS.primary}
        />
        <Text style={styles.title}>Attendance Report</Text>
        <Text style={styles.muted}>
          Only teacher accounts can access attendance reports.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="document-text-outline"
            size={25}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Attendance Report</Text>
          <Text style={styles.muted}>
            Review attendance and export your reports.
          </Text>
        </View>
      </View>

      {/* Period selector */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          <Text style={styles.sectionSubtitle}>
            {period === 'month'
              ? 'Records for the current month'
              : 'All available attendance records'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setPeriod((current) =>
              current === 'month' ? 'all' : 'month'
            )
          }
          style={styles.filterButton}
        >
          <Text style={styles.filterText}>
            {period === 'month' ? 'This Month' : 'All Time'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={15}
            color={COLORS.textSecondary}
          />
        </Pressable>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.primarySummary]}>
          <View style={styles.summaryIconLight}>
            <Ionicons
              name="checkmark-circle"
              size={23}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.summaryNumberLight}>
            {totalAttendance}
          </Text>
          <Text style={styles.summaryLabelLight}>Recorded</Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: '#EDE4FA' },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.summaryNumber}>{totalEvents}</Text>
          <Text style={styles.summaryLabel}>Events</Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: '#DDF6F0' },
            ]}
          >
            <Ionicons
              name="download-outline"
              size={22}
              color="#168C78"
            />
          </View>
          <Text style={styles.summaryNumber}>
            {filteredEvents.length}
          </Text>
          <Text style={styles.summaryLabel}>Reports</Text>
        </View>
      </View>

      {/* Attendance history */}
      <View style={styles.recordsHeader}>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          <Text style={styles.sectionSubtitle}>
            Check-in time and event information
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh attendance reports"
          onPress={() => void load()}
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={COLORS.primary}
          />
        </Pressable>
      </View>

      {filteredEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="calendar-clear-outline"
            size={38}
            color={COLORS.primary}
          />
          <Text style={styles.emptyTitle}>No attendance records</Text>
          <Text style={styles.muted}>
            {period === 'month'
              ? 'There are no attendance records for this month. Switch to All Time to check older records.'
              : 'Attendance records will appear here after students scan event QR codes.'}
          </Text>

          {period === 'month' && (
            <Pressable
              onPress={() => setPeriod('all')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                View All Records
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        filteredEvents.map((event) => (
          <View key={event.eventId} style={styles.eventCard}>
            {/* Event header */}
            <View style={styles.eventHeader}>
              <View style={styles.eventIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventCode}>
                  Event code: {event.eventCode}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {event.attendees.length}
                </Text>
              </View>
            </View>

            <View style={styles.eventDivider} />

            {/* Individual attendance records */}
            {event.attendees.map((attendee, index) => {
              const scannedDate = new Date(attendee.scannedAt);
              const validDate = !Number.isNaN(scannedDate.getTime());

              const dateText = validDate
                ? scannedDate.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Date unavailable';

              const timeText = validDate
                ? scannedDate.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Time unavailable';

              const displayName =
                studentNames[attendee.studentId] || 'Name unavailable';

              return (
                <View
                  key={`${event.eventId}-${attendee.studentId}-${attendee.scannedAt}-${index}`}
                  style={styles.attendanceRow}
                >
                  <View style={styles.attendanceMain}>
                    <View style={styles.studentIcon}>
                      <Ionicons
                        name="person-outline"
                        size={19}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.attendanceInfo}>
                      <Text
                        style={styles.studentName}
                        numberOfLines={2}
                      >
                        {displayName}
                      </Text>
                      <Text style={styles.dateText}>{dateText}</Text>
                    </View>
                  </View>

                  <View style={styles.checkinBlock}>
                    <Text style={styles.checkinLabel}>Check-in</Text>
                    <Text style={styles.checkinTime}>{timeText}</Text>
                    <View style={styles.statusBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color="#168C78"
                      />
                      <Text style={styles.statusText}>Recorded</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* CSV export */}
            <Pressable
              accessibilityRole="button"
              disabled={exportingId !== null}
              onPress={() => void exportOne(event)}
              style={({ pressed }) => [
                styles.exportButton,
                pressed && { opacity: 0.8 },
                exportingId !== null && { opacity: 0.55 },
              ]}
            >
              {exportingId === event.eventId ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.exportButtonText}>
                {exportingId === event.eventId
                  ? 'Preparing CSV...'
                  : 'Export Event CSV'}
              </Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        Reports are based on attendance records retrieved from Supabase.
        Check-in times represent recorded scan timestamps.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 17,
    paddingBottom: 32,
    gap: 17,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 13,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  summaryCard: {
    flex: 1,
    minHeight: 137,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 9,
    gap: 7,
  },
  primarySummary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconLight: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryNumberLight: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  summaryLabelLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 25,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginTop: 4,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    gap: 13,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: 5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  countBadge: {
    minWidth: 33,
    height: 33,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  eventDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  attendanceMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  studentIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceInfo: {
    flex: 1,
    gap: 5,
  },
  studentName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  checkinBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  checkinLabel: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  checkinTime: {
    color: '#2876D2',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DDF6F0',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusText: {
    color: '#168C78',
    fontSize: 9,
    fontWeight: '700',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 2,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
});
