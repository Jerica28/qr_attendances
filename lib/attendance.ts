
import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

// ==========================================
// STUDENT ATTENDANCE RECORD
// ==========================================

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

// ==========================================
// TEACHER EVENT ATTENDANCE
// ==========================================

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string;
    scannedAt: string;
  }[];
};

// ==========================================
// REGISTER ATTENDANCE
// ==========================================

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const result = parseQRPayload(rawPayload);

  if (!result.ok) {
    return {
      success: false,
      message: result.message,
    };
  }

  const payload = result.payload;
  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end !== null && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title ?? payload.event;
  const foundEvent = await getEventByCode(payload.event);

  let event: { id: string; title: string } | null =
    foundEvent ?? null;

  if (!event) {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        event_code: payload.event,
        title,
        start_time: payload.start ?? null,
        end_time: payload.end ?? null,
      })
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      console.error('Could not create event:', insertError);

      return {
        success: false,
        message: 'Could not create event.',
      };
    }

    event = newEvent;
  }

  if (!event) {
    return {
      success: false,
      message: 'Event could not be found or created.',
    };
  }

  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_id: event.id,
    });

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    console.error('Could not register attendance:', attendanceError);

    return {
      success: false,
      message: attendanceError.message,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

// ==========================================
// STUDENT HISTORY
// ==========================================

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events(event_code, title)')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    console.error('Error loading student history:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? 'Untitled Event',
    scannedAt: row.scanned_at,
  }));
}

// ==========================================
// TEACHER EVENT ATTENDANCE
// Includes actual student names
// ==========================================

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error('Error loading teacher events:', eventError);
    return [];
  }

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError || !attendance) {
    console.error('Error loading attendance:', attendanceError);
    return [];
  }

  // Look up student names from profiles using their UUIDs.
  const studentIds = [
    ...new Set(
      attendance.map((row: any) => row.student_id as string)
    ),
  ];

  const { data: profiles, error: profileError } =
    studentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds)
      : { data: [], error: null };

  if (profileError) {
    console.error('Error loading student profiles:', profileError);
  }

  const names = new Map<string, string>(
    (profiles ?? []).map((profile: any) => [
      profile.id,
      profile.full_name?.trim() || 'Unknown Student',
    ])
  );

  return events.map((event: any) => {
    const rows = attendance.filter(
      (row: any) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time ?? null,
      endTime: event.end_time ?? null,
      attendeeCount: rows.length,
      attendees: rows.map((row: any) => ({
        studentId: row.student_id,
        studentName:
          names.get(row.student_id) ?? 'Unknown Student',
        scannedAt: row.scanned_at,
      })),
    };
  });
}

// ==========================================
// TEACHER EVENT SUMMARY
// Used by Dashboard
// ==========================================

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error(
      'Error loading teacher event summary:',
      eventError
    );
    return [];
  }

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attendanceError || !attendance) {
    console.error(
      'Error loading attendance counts:',
      attendanceError
    );
    return [];
  }

  const counts: Record<string, number> = {};

  attendance.forEach((row: any) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event: any) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}
