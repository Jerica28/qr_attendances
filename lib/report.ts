import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import type { TeacherEventAttendance } from './attendance';

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportEventAttendanceCsv(
  event: TeacherEventAttendance
): Promise<void> {
  const rows = [
    ['Event Title', event.title],
    ['Event Code', event.eventCode],
    ['Student ID', 'Scanned At'],
    ...event.attendees.map((attendee) => [
      attendee.studentId,
      new Date(attendee.scannedAt).toLocaleString(),
    ]),
  ];

  const csv = rows
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

  const safeName =
    event.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 50) ||
    'attendance';

  const baseDir = FileSystem.cacheDirectory;

  if (!baseDir) {
    throw new Error('File cache directory is unavailable.');
  }

  const fileUri = `${baseDir}${safeName}_attendance.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    Alert.alert(
      'CSV Created',
      `The CSV was saved temporarily at: ${fileUri}`
    );
    return;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: `Export ${event.title} attendance`,
    UTI: 'public.comma-separated-values-text',
  });
}
