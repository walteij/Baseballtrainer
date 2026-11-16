import { randomUUID } from 'node:crypto';
import type { AgeGroupId, Team, TeamSeason } from '../../../shared/types/entities.js';
import type { ITeamService } from './interfaces/ITeamService.js';
import { ConflictError, NotFoundError } from '../errors/errorTypes.js';
import { TEAM, find, record, batchRecord, clean, type BatchRepository } from './data.js';

const ageOrder: Record<AgeGroupId, number> = { Beeball: 0, U12: 1, U15: 2, U21: 3, Senioren: 4 };
// Club convention: Rookies (younger) sort before Majors when the rest of the name matches.
const levelRank = (name: string) => (/\brookies\b/i.test(name) ? 0 : /\bmajors\b/i.test(name) ? 1 : 2);
const levelPrefix = (name: string) => name.replace(/\b(rookies|majors)\b/i, '').replace(/\s+/g, ' ').trim();
const byName = (a: string, b: string) =>
  levelPrefix(a).localeCompare(levelPrefix(b), 'nl', { numeric: true, sensitivity: 'base' }) ||
  levelRank(a) - levelRank(b) ||
  a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' });
export const compareTeams = (a: Team, b: Team): number =>
  (ageOrder[a.age_group_id] ?? 99) - (ageOrder[b.age_group_id] ?? 99) || byName(a.name, b.name);

export class TeamService implements ITeamService {
  constructor(private readonly repo: BatchRepository) {}
  async listTeams(): Promise<Team[]> { return (await find<Team>(this.repo, TEAM, 'team')).sort(compareTeams); }
  async listSeasons(teamId: string): Promise<TeamSeason[]> {
    if (!await this.repo.getById(TEAM, teamId, teamId)) throw new NotFoundError('Team', teamId);
    return find<TeamSeason>(this.repo, TEAM, 'season', { team_id: teamId }, teamId);
  }
  async createTeam(input: Parameters<ITeamService['createTeam']>[0]): Promise<Team> {
    const team: Team = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
    return clean(await this.repo.create(TEAM, record('team', team.id, team)));
  }
  async updateTeam(id: string, input: Parameters<ITeamService['updateTeam']>[1]): Promise<Team | null> {
    const team = await this.repo.getById<Team>(TEAM, id, id);
    if (!team) return null;
    return clean(await this.repo.upsert(TEAM, record('team', id, { ...team, ...input, updated_at: new Date().toISOString() })));
  }
  async createSeason(teamId: string, input: Parameters<ITeamService['createSeason']>[1]): Promise<TeamSeason> {
    if (!await this.repo.getById(TEAM, teamId, teamId)) throw new NotFoundError('Team', teamId);
    const season: TeamSeason = { id: randomUUID(), team_id: teamId, ...input, created_at: new Date().toISOString() };
    // The deterministic guard enforces uniqueness even under concurrent requests.
    const guard = { id: `season-year-${input.year}`, team_id: teamId, kind: 'season-year', season_id: season.id };
    try {
      await this.repo.batch(TEAM, teamId, [
        { operationType: 'Create', resourceBody: guard },
        { operationType: 'Create', resourceBody: batchRecord('season', teamId, season) },
      ]);
    } catch (error) {
      if ((error as { code?: number }).code === 409) throw new ConflictError('A season already exists for this team and year');
      throw error;
    }
    return season;
  }
  healthCheck(): Promise<boolean> { return this.repo.healthCheck(); }
}
