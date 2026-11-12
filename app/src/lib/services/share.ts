import type { Session } from '$lib/api/types';

export function sessionSummary(session: Session): string {
  return `${session.title} · ${session.date} ${session.time}–${session.end}\n${session.location}\n${session.focus}`;
}
const escapeIcal = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
export function icalForSession(session: Session): string {
  const date = session.date.replaceAll('-', '');
  const endDate = new Date(`${session.date}T00:00:00Z`);
  if (session.end <= session.time) endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDay = endDate.toISOString().slice(0, 10).replaceAll('-', '');
  const time = (value: string): string => value.replace(':', '') + '00';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Honkbal Trainer//NL', 'BEGIN:VEVENT',
    `UID:${escapeIcal(session.team_id)}-${escapeIcal(session.id)}@honkbaltrainer`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=Europe/Amsterdam:${date}T${time(session.time)}`,
    `DTEND;TZID=Europe/Amsterdam:${endDay}T${time(session.end)}`,
    `SUMMARY:${escapeIcal(session.title)}`, `LOCATION:${escapeIcal(session.location)}`,
    `DESCRIPTION:${escapeIcal(session.focus)}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
export function downloadIcal(session: Session): void {
  const url = URL.createObjectURL(new Blob([icalForSession(session)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `training-${session.id}.ics`; link.click(); URL.revokeObjectURL(url);
}
export function whatsapp(session: Session): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(sessionSummary(session))}`, '_blank', 'noopener,noreferrer');
}
