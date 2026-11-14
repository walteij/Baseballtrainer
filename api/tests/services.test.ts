import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalsService } from '../src/services/goals.js';
import { TeamService } from '../src/services/teams.js';
import { SkillService } from '../src/services/skills.js';
import { ProgramService } from '../src/services/programs.js';
import { CatalogService } from '../src/services/catalog.js';
import { CurriculumService } from '../src/services/curriculum.js';
import { clearServices, getServices, registerServices } from '../src/services/registry.js';
import { MemoryRepository } from './memory.js';

const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
const team2 = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
const seasonId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23423';
const goalId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23424';
let repo: MemoryRepository;
beforeEach(() => {
  repo = new MemoryRepository({
    'team-records': [
      { kind: 'team', id: teamId, team_id: teamId, name: 'Team A', age_group_id: 'U12' },
      { kind: 'team', id: team2, team_id: team2, name: 'Team B', age_group_id: 'U15' },
      { kind: 'season', id: seasonId, team_id: teamId, year: 2026, age_group_id: 'U12' },
    ],
    'reference-data': [
      { kind: 'age-goal', id: goalId, age_group_id: 'U12', version: 1, text: 'Basis', skill_ids: ['catch'] },
      { kind: 'skill', id: 'catch', name: 'Vangen', description: 'Basis' },
      { kind: 'progression', id: 'p1', skill_id: 'catch', age_group_id: 'U12', version: 1, level: 1, description: 'Basis' },
      { kind: 'progression', id: 'p2', skill_id: 'catch', age_group_id: 'U15', version: 1, level: 2, description: 'Volgende stap' },
    ],
  });
  clearServices();
});
describe('domain services', () => {
  it('publishes versioned curricula and retains previous team-goal versions', async () => {
    const curricula = new CurriculumService(repo);
    const input = {
      goals: [{ text: 'Doel', skill_ids: ['catch'] }],
      skills: [{ id: 'catch', name: 'Vangen', description: 'Vangvaardigheid', level: 1, progression: 'Aanleren' }],
    };
    const first = await curricula.save('U12', 0, input);
    expect((await new GoalsService(repo).getAgeGroupGoals('U12', 1))?.goals[0].id).toBe(first.goals[0].id);
    const saved = await new GoalsService(repo).saveTeamSeasonGoals(teamId, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [first.goals[0].id], team_goals: [] });
    const second = await curricula.save('U12', 1, { ...input, goals: [{ ...first.goals[0], text: 'Bijgesteld' }] });
    expect(second.version).toBe(2);
    expect((await new GoalsService(repo).getAgeGroupGoals('U12'))?.goals[0].text).toBe('Bijgesteld');
    expect((await new GoalsService(repo).getAgeGroupGoals('U12', 1))?.goals[0].text).toBe('Doel');
    expect((await new GoalsService(repo).getTeamSeasonGoals(teamId, seasonId))?.goals).toEqual(saved.goals);
    expect((await new SkillService(repo).getProgression('U12')).progressions[0].version).toBe(2);
    await expect(curricula.save('U12', 1, input)).rejects.toMatchObject({ status: 409 });
    await expect(curricula.save('U15', 0, { ...input, goals: [{ text: 'Doel', skill_ids: ['unknown'] }] })).rejects.toMatchObject({ status: 422 });
  });
  it('snapshots deduplicated versioned generic goals and isolates seasons', async () => {
    const svc = new GoalsService(repo);
    const saved = await svc.saveTeamSeasonGoals(teamId, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [goalId, goalId], team_goals: [{ text: 'Teamdoel', skill_ids: ['catch'] }] });
    expect(saved.goals).toHaveLength(2);
    expect(saved.goals[0]).toMatchObject({ source: 'generiek', generic_goal_version: 1, team_id: teamId, season_id: seasonId });
    repo.data.get('reference-data')![0].text = 'Changed';
    expect((await svc.getTeamSeasonGoals(teamId, seasonId))?.goals[0].text).toBe('Basis');
    await expect(svc.getTeamSeasonGoals(team2, seasonId)).rejects.toMatchObject({ status: 404 });
    await expect(svc.saveTeamSeasonGoals(team2, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [] })).rejects.toMatchObject({ status: 404 });
  });
  it('replaces team goals atomically and prevents id collisions', async () => {
    const svc = new GoalsService(repo);
    const first = await svc.saveTeamSeasonGoals(teamId, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [{ text: 'First', skill_ids: [] }] });
    await svc.saveTeamSeasonGoals(teamId, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [goalId], team_goals: [] });
    expect(await repo.getById('team-records', first.goals[0].id, teamId)).toBeNull();
    await expect(svc.saveTeamSeasonGoals(teamId, seasonId, { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [{ id: teamId, text: 'Collision', skill_ids: [] }] })).rejects.toMatchObject({ status: 409 });
  });
  it('creates only one season for each team/year and allows different teams', async () => {
    const teams = new TeamService(repo);
    await teams.createSeason(teamId, { year: 2027, age_group_id: 'U12' });
    await expect(teams.createSeason(teamId, { year: 2027, age_group_id: 'U15' })).rejects.toMatchObject({ status: 409 });
    await expect(teams.createSeason(team2, { year: 2027, age_group_id: 'U15' })).resolves.toMatchObject({ team_id: team2 });
  });
  it('lists only the requested team seasons and sessions, sorted, and rejects missing teams', async () => {
    repo.data.get('team-records')!.push(
      { kind: 'session', id: 'later', team_id: teamId, date: '2026-03-01', time: '20:00' },
      { kind: 'session', id: 'earlier', team_id: teamId, date: '2026-03-01', time: '19:00' },
      { kind: 'session', id: 'other', team_id: team2, date: '2026-02-01', time: '19:00' },
    );
    const teams = new TeamService(repo);
    const programs = new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
    expect((await teams.listSeasons(teamId)).map(s => s.id)).toEqual([seasonId]);
    expect(await teams.listSeasons(team2)).toEqual([]);
    expect((await programs.listTeamSessions(teamId)).map(s => s.id)).toEqual(['earlier', 'later']);
    expect((await programs.listTeamSessions(team2)).map(s => s.id)).toEqual(['other']);
    await expect(teams.listSeasons('missing')).rejects.toMatchObject({ status: 404 });
    await expect(programs.listTeamSessions('missing')).rejects.toMatchObject({ status: 404 });
  });
  it('preserves team skill history across category changes', async () => {
    const skills = new SkillService(repo);
    await skills.updateTeamProgress(teamId, 'catch', { status: 'developing' });
    await new TeamService(repo).updateTeam(teamId, { age_group_id: 'U15' });
    expect(await skills.getTeamProgress(teamId)).toMatchObject([{ skill_id: 'catch', status: 'developing' }]);
    expect(await skills.getTeamProgress(team2)).toEqual([]);
    expect((await skills.getProgression('U15')).progressions[0].level).toBe(2);
  });
  it('generates team-partitioned sessions with eligible skills, equipment and repeat gap', async () => {
    repo.data.get('reference-data')!.push({ kind: 'catalog', id: 'catalog', drills: [
      { id: 'd1', name_nl: 'Vangen', category: 'catching', skills: ['catch'], equipment_required: [], indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: 10, minimum: 10, maximum: 10 }, selection: { minimum_repeat_gap_days: 14 } },
      { id: 'd2', name_nl: 'Anders', category: 'other', skills: ['other'], equipment_required: [], indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: 10, minimum: 10, maximum: 10 }, selection: { minimum_repeat_gap_days: 0 } },
      { id: 'd3', name_nl: 'Vangvariant', category: 'catching', skills: ['catch'], equipment_required: [], indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: 10, minimum: 10, maximum: 10 }, selection: { minimum_repeat_gap_days: 14 } },
    ], categories: {}, warmup: { duration_minutes: 5, blocks: [] } });
    const svc = new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
    const result = await svc.createProgram(teamId, { startDate: '2026-01-05', day: 'dinsdag', time: '19:00', duration: 15, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false });
    expect(result.sessions).toHaveLength(12);
    expect(result.sessions[0].date).toBe('2026-01-06');
    expect(result.sessions[0].blocks.map(b => b.drill_id)).toContain('d1');
    expect(result.sessions[1].blocks.map(b => b.drill_id)).not.toContain('d1');
    expect(result.sessions.flatMap(s => s.blocks).map(b => b.drill_id)).not.toContain('d2');
    expect(result.sessions.every(s => s.blocks.reduce((sum, b) => sum + b.minutes, 0) === 15)).toBe(true);
    expect((await svc.listSessions(result.program.id))?.every(s => s.team_id === teamId)).toBe(true);
  });
  it.each([
    { reason: 'missing equipment', equipment: ['gloves'], duration: 70, gap: 0, date: '2026-01-06', planned: 20 },
    { reason: 'a later repeat gap', equipment: [], duration: 70, gap: 14, date: '2026-01-13', planned: 20 },
    { reason: 'a remainder below the drill minimum', equipment: [], duration: 65, gap: 0, date: '2026-01-06', planned: 85 },
  ])('rejects the entire program for $reason without storing any sessions', async ({ equipment, duration, gap, date, planned }) => {
    repo.data.get('reference-data')!.push({ kind: 'catalog', id: 'catalog', drills: [
      { id: 'd1', name_nl: 'Vangen', category: 'catching', skills: ['catch'], equipment_required: equipment, indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: duration, minimum: 8, maximum: duration }, selection: { minimum_repeat_gap_days: gap } },
    ], categories: {}, warmup: { duration_minutes: 20, blocks: [] } });
    const before = structuredClone(repo.data.get('team-records'));
    const batch = vi.spyOn(repo, 'batch');
    const svc = new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
    await expect(svc.createProgram(teamId, { startDate: '2026-01-05', day: 'dinsdag', time: '20:30', duration: 90, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false }))
      .rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR', details: { date, requestedMinutes: 90, plannedMinutes: planned, missingMinutes: 90 - planned } });
    expect(batch).not.toHaveBeenCalled();
    expect(repo.data.get('team-records')).toEqual(before);
  });
  it('refuses to create empty programs when age-group progression is missing', async () => {
    repo.data.get('reference-data')!.push({ kind: 'catalog', id: 'catalog', drills: [], categories: {}, warmup: { duration_minutes: 0, blocks: [] } });
    const svc = new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
    repo.data.set('reference-data', repo.data.get('reference-data')!.filter(item => item.kind !== 'progression'));
    await expect(svc.createProgram(teamId, { startDate: '2026-01-05', day: 'dinsdag', time: '19:00', duration: 30, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false }))
      .rejects.toMatchObject({ status: 422, code: 'MISSING_PROGRESSION' });
    expect(repo.data.get('team-records')!.filter(item => item.kind === 'program' && item.team_id === teamId)).toHaveLength(0);
  });
});
describe('registry', () => {
  it('auto-initializes and caches with development config, and honors mock registration', () => {
    vi.stubEnv('AZURE_FUNCTIONS_ENVIRONMENT', 'Development');
    vi.stubEnv('COSMOSDB_CONNECTION_STRING', 'AccountEndpoint=https://localhost:8081/;AccountKey=YWJjZA==;');
    const first = getServices();
    expect(getServices()).toBe(first);
    registerServices({ ...first, cosmos: { healthCheck: async () => false } });
    expect(getServices()).not.toBe(first);
    vi.unstubAllEnvs(); clearServices();
  });
  it('does not fall back to a connection string without explicit Development', () => {
    vi.stubEnv('AZURE_FUNCTIONS_ENVIRONMENT', '');
    vi.stubEnv('COSMOSDB_ENDPOINT', '');
    vi.stubEnv('COSMOSDB_CONNECTION_STRING', 'AccountEndpoint=https://localhost:8081/;AccountKey=YWJjZA==;');
    expect(() => getServices()).toThrow('COSMOSDB_ENDPOINT');
    vi.unstubAllEnvs(); clearServices();
  });
});
