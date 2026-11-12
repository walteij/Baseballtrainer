import { randomUUID } from 'node:crypto';
import type { Program, ProgramSettings, Session, Team } from '../../../shared/types/entities.js';
import type { IProgramService } from './interfaces/IProgramService.js';
import type { ICatalogService } from './interfaces/ICatalogService.js';
import type { ISkillService } from './interfaces/ISkillService.js';
import { NotFoundError, ValidationError } from '../errors/errorTypes.js';
import { AppError } from '../errors/AppError.js';
import { TEAM, clean, find, record, batchRecord, type BatchRepository } from './data.js';

const days: Record<string, number> = { zondag: 0, sunday: 0, maandag: 1, monday: 1, dinsdag: 2, tuesday: 2, woensdag: 3, wednesday: 3, donderdag: 4, thursday: 4, vrijdag: 5, friday: 5, zaterdag: 6, saturday: 6 };
export class ProgramService implements IProgramService {
  constructor(private readonly repo: BatchRepository, private readonly catalog: ICatalogService, private readonly skills: ISkillService) {}
  async createProgram(teamId: string, settings: ProgramSettings) {
    const team = await this.repo.getById<Team>(TEAM, teamId, teamId);
    if (!team) throw new NotFoundError('Team', teamId);
    const day = days[settings.day.toLowerCase()];
    if (day === undefined) throw new ValidationError('Unknown training day');
    const [catalog, progression] = await Promise.all([this.catalog.getCatalog(), this.skills.getProgression(team.age_group_id)]);
    if (progression.progressions.length === 0) {
      throw new AppError('MISSING_PROGRESSION', 'No skill progression is configured for this age group', 422);
    }
    const skillIds = new Set(progression.progressions.map(p => p.skill_id));
    const equipment = new Set(settings.equipment.map(e => e.toLowerCase()));
    const indoor = /indoor|zaal/i.test(settings.location);
    const eligible = catalog.drills.filter(d =>
      d.skills.some(s => skillIds.has(s)) &&
      d.equipment_required.every(e => equipment.has(e.toLowerCase())) &&
      (!indoor || d.indoor_friendly) &&
      (!/field|veld/i.test(d.space_required) || settings.field) &&
      (!/cage|kooi/i.test(d.space_required) || settings.cage) &&
      (!/mound/i.test(d.space_required) || settings.mound));
    const program: Program = { id: randomUUID(), team_id: teamId, settings, created_at: new Date().toISOString() };
    const start = new Date(`${settings.startDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() + (day - start.getUTCDay() + 7) % 7);
    const lastUsed = new Map<string, number>();
    const sessions: Session[] = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(date.getUTCDate() + index * 7);
      let remaining = settings.duration;
      const blocks: Session['blocks'] = [];
      let minutes = Number(settings.time.slice(0, 2)) * 60 + Number(settings.time.slice(3));
      const format = (n: number) => `${String(Math.floor((n % 1440) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
      const warmupMinutes = Math.min(catalog.warmup.duration_minutes, remaining);
      if (warmupMinutes > 0) { blocks.push({ id: randomUUID(), time: format(minutes), title: 'Warming-up', minutes: warmupMinutes, detail: catalog.warmup.blocks.map(b => b.name).join(' · ') }); minutes += warmupMinutes; remaining -= warmupMinutes; }
      const candidates = eligible.filter(d => index * 7 - (lastUsed.get(d.id) ?? -Infinity) >= d.selection.minimum_repeat_gap_days);
      for (const d of candidates) {
        const duration = Math.min(d.duration_minutes.default, remaining);
        if (duration < d.duration_minutes.minimum) continue;
        blocks.push({ id: randomUUID(), time: format(minutes), title: d.name_nl, minutes: duration, detail: d.category, drill_id: d.id });
        minutes += duration; remaining -= duration; lastUsed.set(d.id, index * 7);
        if (remaining <= 0) break;
      }
      return { id: randomUUID(), team_id: teamId, program_id: program.id, title: `${settings.phase} #${index + 1}`, date: date.toISOString().slice(0, 10), time: settings.time, end: format(Number(settings.time.slice(0, 2)) * 60 + Number(settings.time.slice(3)) + settings.duration), phase: settings.phase, location: settings.location, focus: blocks.slice(1).map(b => b.detail).join(' · '), blocks, completed: false, completed_items: [], equipment: settings.equipment };
    });
    await this.repo.batch(TEAM, teamId, [
      { operationType: 'Create', resourceBody: batchRecord('program', teamId, program) },
      ...sessions.map(s => ({ operationType: 'Create' as const, resourceBody: batchRecord('session', teamId, s) })),
    ]);
    return { program, sessions };
  }
  async getProgram(id: string): Promise<Program | null> { return (await find<Program>(this.repo, TEAM, 'program', { id }))[0] ?? null; }
  async listTeamSessions(teamId: string): Promise<Session[]> {
    if (!await this.repo.getById(TEAM, teamId, teamId)) throw new NotFoundError('Team', teamId);
    const sessions = await find<Session>(this.repo, TEAM, 'session', { team_id: teamId }, teamId);
    return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  async listSessions(programId: string): Promise<Session[] | null> {
    const program = await this.getProgram(programId);
    if (!program) return null;
    return find(this.repo, TEAM, 'session', { team_id: program.team_id, program_id: programId }, program.team_id);
  }
  async getSession(id: string): Promise<Session | null> { return (await find<Session>(this.repo, TEAM, 'session', { id }))[0] ?? null; }
  async saveSession(id: string, session: Session): Promise<Session> {
    if (id !== session.id || !await this.repo.getById(TEAM, id, session.team_id)) throw new NotFoundError('Session', id);
    return clean(await this.repo.upsert(TEAM, record('session', session.team_id, session)));
  }
  healthCheck(): Promise<boolean> { return this.repo.healthCheck(); }
}
