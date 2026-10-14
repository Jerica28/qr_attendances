import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_MINUTES = 15;

export async function requestReminderPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('event-reminders', {
        name: 'Event Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    let { status } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    return status === 'granted';
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
}

export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startTime: string
): Promise<string> {
  if (!eventId.trim() || !eventTitle.trim()) {
    throw new Error('Event ID and title are required.');
  }

  const startTimestamp = new Date(startTime).getTime();

  if (!Number.isFinite(startTimestamp)) {
    throw new Error('Invalid event start time.');
  }

  const reminderTimestamp =
    startTimestamp - REMINDER_MINUTES * 60 * 1000;

  if (reminderTimestamp <= Date.now()) {
    throw new Error('The event must start more than 15 minutes from now.');
  }

  if (!(await requestReminderPermission())) {
    throw new Error('Please allow notifications in your device settings.');
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const existing = scheduled.find(
    (notification) =>
      notification.content.data?.eventId === eventId &&
      notification.content.data?.reminderType === 'event-reminder'
  );

  if (existing) {
    return existing.identifier;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Event',
      body: `${eventTitle} starts in 15 minutes.`,
      sound: true,
      data: { eventId, reminderType: 'event-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderTimestamp),
      ...(Platform.OS === 'android' ? { channelId: 'event-reminders' } : {}),
    },
  });
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matches = scheduled.filter(
    (notification) =>
      notification.content.data?.eventId === eventId &&
      notification.content.data?.reminderType === 'event-reminder'
  );

  await Promise.all(
    matches.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}

export async function getScheduledEventReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.filter(
    (notification) =>
      notification.content.data?.reminderType === 'event-reminder'
  );
}