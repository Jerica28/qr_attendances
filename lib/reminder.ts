
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

    const existing = await Notifications.getPermissionsAsync();

    let status = existing.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    return status === 'granted';
  } catch (error) {
    console.error('Could not request notification permission:', error);
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
    throw new Error('The event start time is invalid.');
  }

  const reminderTimestamp =
    startTimestamp - REMINDER_MINUTES * 60 * 1000;

  if (reminderTimestamp <= Date.now()) {
    throw new Error(
      'There is not enough time to schedule a reminder 15 minutes before this event.'
    );
  }

  const permitted = await requestReminderPermission();

  if (!permitted) {
    throw new Error(
      'Notification permission was not granted. Enable notifications in your device settings.'
    );
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const alreadyScheduled = scheduled.find(
    (notification) =>
      notification.content.data?.eventId === eventId &&
      notification.content.data?.reminderType === 'event-reminder'
  );

  if (alreadyScheduled) {
    return alreadyScheduled.identifier;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Event',
      body: `${eventTitle} starts in 15 minutes.`,
      data: {
        eventId,
        reminderType: 'event-reminder',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderTimestamp),
      ...(Platform.OS === 'android'
        ? { channelId: 'event-reminders' }
        : {}),
    },
  });
}

export async function cancelEventReminder(
  eventId: string
): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matches = scheduled.filter(
    (notification) =>
      notification.content.data?.eventId === eventId &&
      notification.content.data?.reminderType === 'event-reminder'
  );

  await Promise.all(
    matches.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      )
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
