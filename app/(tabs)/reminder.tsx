import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';


import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import {
  cancelEventReminder,
  getScheduledEventReminders,
  scheduleEventReminder,
} from '@/lib/reminders';

type EventItem = {
  id: string;
  title: string;
  event_code: string;
  start_time: string;
};

type ScheduledReminder = {
  identifier: string;
  content: {
    data?: {
      eventId?: string;
      reminderType?: string;
    };
  };
};

export default function ReminderScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    const scheduled = (await getScheduledEventReminders()) as ScheduledReminder[];
    setReminderIds(
      scheduled
        .map((item) => item.content.data?.eventId)
        .filter((id): id is string => typeof id === 'string')
    );
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_code, start_time')
        .not('start_time', 'is', null)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      setEvents((data ?? []) as EventItem[]);
      await loadReminders();
    } catch (error) {
      console.error('Unable to load reminder events:', error);
      Alert.alert(
        'Unable to Load Events',
        'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadReminders]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const refresh = () => {
    setRefreshing(true);
    void loadEvents();
  };

  const handleSetReminder = async (event: EventItem) => {
    try {
      setBusyId(event.id);

      await scheduleEventReminder(
        event.id,
        event.title,
        event.start_time
      );

      await loadReminders();

      Alert.alert(
        'Reminder Set',
        `You will be reminded 15 minutes before "${event.title}".`
      );
    } catch (error) {
      Alert.alert(
        'Could Not Set Reminder',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelReminder = async (event: EventItem) => {
    try {
      setBusyId(event.id);
      await cancelEventReminder(event.id);
      await loadReminders();

      Alert.alert('Reminder Cancelled', 'Your event reminder was cancelled.');
    } catch (error) {
      Alert.alert(
        'Could Not Cancel Reminder',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: EventItem }) => {
    const isScheduled = reminderIds.includes(item.id);
    const isBusy = busyId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={24} color={COLORS.primary} />
        </View>

        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventCode}>Event code: {item.event_code}</Text>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={17} color={COLORS.primary} />
          <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
        </View>

        <View style={styles.reminderInfo}>
          <Ionicons
            name="time-outline"
            size={17}
            color={COLORS.primary}
          />
          <Text style={styles.reminderInfoText}>
            Reminder: 15 minutes before the event
          </Text>
        </View>

        <Pressable
          style={[
            styles.button,
            isScheduled && styles.cancelButton,
            isBusy && styles.disabledButton,
          ]}
          disabled={isBusy}
          onPress={() =>
            isScheduled
              ? handleCancelReminder(item)
              : handleSetReminder(item)
          }
        >
          {isBusy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isScheduled ? 'close-circle-outline' : 'alarm-outline'}
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                {isScheduled ? 'Cancel Reminder' : 'Set 15-Minute Reminder'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading upcoming events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.heading}>Notifications & Reminders</Text>
        <Text style={styles.subtitle}>
          Set a reminder 15 minutes before an upcoming event.
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={[
          styles.listContent,
          events.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={52}
              color={COLORS.primary}
            />
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.emptyText}>
              Upcoming events with a start time will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 14,
    marginTop: 7,
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    color: '#4C1D95',
    fontSize: 19,
    fontWeight: '800',
  },
  eventCode: {
    color: '#6B5A7E',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dateText: {
    flex: 1,
    color: '#3F3450',
    fontSize: 14,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reminderInfoText: {
    flex: 1,
    color: '#4C1D95',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  cancelButton: {
    backgroundColor: '#7E22CE',
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: '#4C1D95',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
});