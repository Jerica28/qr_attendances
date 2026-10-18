
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getTeacherEventSummary,
  type TeacherEventSummary,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profile';

const TEAL = '#32BFAF';
const ORANGE = '#F28C45';
const PURPLE = COLORS.primary;

export default function DashboardScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [events, setEvents] = useState<TeacherEventSummary[]>([]);
  const [showAllEvents, setShowAllEvents] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? 'student');

      if (profile?.role === 'teacher') {
        const summaries = await getTeacherEventSummary(user.id);
        setEvents(summaries);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Dashboard load failed:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const totalEvents = events.length;

  const totalAttendance = events.reduce(
    (sum, event) => sum + event.attendeeCount,
    0
  );

  const highestAttendance = Math.max(
    1,
    ...events.map((event) => event.attendeeCount)
  );

  const eventBars = useMemo(
    () =>
      [...events].sort(
        (a, b) => b.attendeeCount - a.attendeeCount
      ),
    [events]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.muted}>Loading attendance statistics...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.center}>
        <View style={styles.lockIcon}>
          <Text style={styles.lockEmoji}>📊</Text>
        </View>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.muted}>
          This dashboard is available to teacher accounts only.
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>
            Your event attendance overview
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAllEvents((current) => !current)}
          style={styles.filterButton}
        >
          <Text style={styles.filterText}>
            {showAllEvents ? 'All Events' : 'Top Events'}
          </Text>
          <Text style={styles.filterArrow}>⌄</Text>
        </Pressable>
      </View>

      {/* Circular summary */}
      <View style={styles.summaryCard}>
        <View style={styles.chartArea}>
          <Svg width={174} height={174} viewBox="0 0 174 174">
            <Circle
              cx="87"
              cy="87"
              r="67"
              stroke={COLORS.surface}
              strokeWidth="16"
              fill="none"
            />

            {totalEvents > 0 && (
              <Circle
                cx="87"
                cy="87"
                r="67"
                stroke={PURPLE}
                strokeWidth="16"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 67 * 0.72} ${2 * Math.PI * 67}`}
                rotation="-90"
                origin="87, 87"
              />
            )}

            {totalEvents > 0 && (
              <Circle
                cx="87"
                cy="87"
                r="67"
                stroke={TEAL}
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 67 * 0.18} ${2 * Math.PI * 67}`}
                strokeDashoffset={-2 * Math.PI * 67 * 0.74}
                rotation="-90"
                origin="87, 87"
              />
            )}
          </Svg>

          <View style={styles.chartCenter}>
            <Text style={styles.centerNumber}>{totalAttendance}</Text>
            <Text style={styles.centerLabel}>Attendance</Text>
            <Text style={styles.centerSmall}>records</Text>
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: PURPLE }]} />
            <Text style={styles.legendLabel}>Events created</Text>
            <Text style={styles.legendValue}>{totalEvents}</Text>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: TEAL }]} />
            <Text style={styles.legendLabel}>Attendance records</Text>
            <Text style={styles.legendValue}>{totalAttendance}</Text>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: ORANGE }]} />
            <Text style={styles.legendLabel}>Average per event</Text>
            <Text style={styles.legendValue}>
              {totalEvents > 0
                ? (totalAttendance / totalEvents).toFixed(1)
                : '0'}
            </Text>
          </View>
        </View>

        <Text style={styles.chartNote}>
          Summary of events you created. The ring is a visual overview,
          not an attendance percentage.
        </Text>
      </View>

      {/* Summary cards */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F0E5FA' }]}>
            <Text style={styles.statEmoji}>📅</Text>
          </View>
          <Text style={styles.statLabel}>Total Events</Text>
          <Text style={styles.statNumber}>{totalEvents}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#DDF7F1' }]}>
            <Text style={styles.statEmoji}>✓</Text>
          </View>
          <Text style={styles.statLabel}>Attendance Records</Text>
          <Text style={styles.statNumber}>{totalAttendance}</Text>
        </View>
      </View>

      {/* Event-wise progress */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Event-wise Attendance</Text>
          <Text style={styles.sectionSubtitle}>
            Compare attendance across your events
          </Text>
        </View>
      </View>

      {eventBars.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>
            Create an event in the Teacher tab to see attendance
            statistics here.
          </Text>
        </View>
      ) : (
        (showAllEvents ? eventBars : eventBars.slice(0, 3)).map(
          (event, index) => {
            const percentage =
              (event.attendeeCount / highestAttendance) * 100;

            const barColor =
              index % 3 === 0
                ? TEAL
                : index % 3 === 1
                  ? ORANGE
                  : PURPLE;

            return (
              <View key={event.eventId} style={styles.eventCard}>
                <View style={styles.eventTop}>
                  <View style={styles.eventTitleArea}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventCode}>
                      Code: {event.eventCode}
                    </Text>
                  </View>

                  <Text style={styles.eventCount}>
                    {event.attendeeCount}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.progressCaption}>
                  {Math.round(percentage)}% of the highest event count
                </Text>
              </View>
            );
          }
        )
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => void load()}
        style={styles.refreshButton}
      >
        <Text style={styles.refreshText}>↻  Refresh Statistics</Text>
      </Pressable>

      <Text style={styles.footer}>
        Statistics are based on the attendance records currently available
        in your database.
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterArrow: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  chartArea: {
    width: 174,
    height: 174,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  centerSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  legend: {
    width: '100%',
    gap: 14,
    paddingHorizontal: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chartNote: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 8,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 19,
    color: PURPLE,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHeader: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 12,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventTitleArea: {
    flex: 1,
    gap: 5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventCount: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressTrack: {
    height: 7,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  refreshButton: {
    backgroundColor: PURPLE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 28,
  },
});
