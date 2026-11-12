import { SessionIcalParamsSchema } from '../../../shared/schemas/validation.js';
import { query, emptyQuery, register, required } from '../http.js';
import { getServices } from '../services/registry.js';
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
register('getSessionIcal', 'GET', 'sessions/{id}/ical', async req => {
  query(req, emptyQuery); const { id } = SessionIcalParamsSchema.parse(req.params);
  const session = required(await getServices().programs.getSession(id), 'Session', id);
  const start = `${session.date.replace(/-/g, '')}T${session.time.replace(':', '')}00`;
  const endDate = new Date(`${session.date}T00:00:00Z`);
  if (session.end <= session.time) endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = `${endDate.toISOString().slice(0, 10).replace(/-/g, '')}T${session.end.replace(':', '')}00`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Honkbal Trainer//NL', 'BEGIN:VEVENT', `UID:${session.id}@honkbal-trainer`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escape(session.title)}`, `LOCATION:${escape(session.location)}`, `DESCRIPTION:${escape(session.focus)}`, 'END:VEVENT', 'END:VCALENDAR'];
  return { status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8' }, body: `${lines.join('\r\n')}\r\n` };
});
