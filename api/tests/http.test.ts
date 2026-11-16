import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { clearServices, registerServices, type Services } from '../src/services/registry.js';
import { authorizeRequest } from '../src/auth.js';
import { AppError } from '../src/errors/AppError.js';
import { TeamAccessService } from '../src/services/teamAccess.js';
import { MemoryRepository } from './memory.js';
import { developmentFixture } from './developmentFixture.js';
import { DevelopmentService } from '../src/services/development.js';
import { DevelopmentAssignmentService } from '../src/services/developmentAssignments.js';

vi.mock('../src/auth.js', async importOriginal => {
  const original = await importOriginal<typeof import('../src/auth.js')>();
  return { ...original, authorizeRequest: vi.fn() };
});
const registrations = vi.hoisted(() => new Map<string, { methods: string[]; route: string; authLevel: string; handler: (req: HttpRequest, context: InvocationContext) => Promise<any> }>());
vi.mock('@azure/functions', async importOriginal => {
  const original = await importOriginal<typeof import('@azure/functions')>();
  return { ...original, app: { http: (name: string, value: any) => registrations.set(name, value) } };
});

const id = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
const session = { id, team_id: id, program_id: id, title: 'Training', date: '2026-01-06', time: '23:30', end: '00:30', phase: 'Winter', location: 'Zaal', focus: 'A,B', blocks: [], completed: false, completed_items: [], equipment: [] };
let mocks: Services;
beforeAll(async () => {
  await Promise.all([
    import('../src/functions/health.js'), import('../src/functions/catalog.js'), import('../src/functions/createProgram.js'),
    import('../src/functions/getProgram.js'), import('../src/functions/getProgramSessions.js'), import('../src/functions/updateSessionCompletion.js'),
    import('../src/functions/getSessionIcal.js'), import('../src/functions/listTeams.js'), import('../src/functions/createTeam.js'),
    import('../src/functions/updateTeam.js'), import('../src/functions/skillProgression.js'), import('../src/functions/getTeamSkillProgress.js'),
    import('../src/functions/updateTeamSkillProgress.js'), import('../src/functions/getAgeGroupGoals.js'), import('../src/functions/createSeason.js'),
    import('../src/functions/getSeasonGoals.js'), import('../src/functions/saveSeasonGoals.js'), import('../src/functions/openapi.js'),
    import('../src/functions/teamAssignments.js'),
    import('../src/functions/listTeamData.js'), import('../src/functions/identity.js'),
    import('../src/functions/curriculum.js'),
    import('../src/functions/development.js'),
    import('../src/functions/getTransitionCheck.js'),
  ]);
});
beforeEach(() => {
  vi.mocked(authorizeRequest).mockReset().mockResolvedValue({ objectId: id, isCommittee: false });
  clearServices();
  mocks = {
    cosmos: { healthCheck: vi.fn().mockResolvedValue(true) }, hostStorage: { healthCheck: vi.fn().mockResolvedValue(true) },
    catalog: { getCatalog: vi.fn().mockResolvedValue({ drills: [], categories: {}, warmup: { duration_minutes: 0, blocks: [] } }), healthCheck: vi.fn() },
    teams: { listTeams: vi.fn().mockResolvedValue([]), listSeasons: vi.fn().mockResolvedValue([]), createTeam: vi.fn().mockResolvedValue({ id }), updateTeam: vi.fn().mockResolvedValue({ id }), createSeason: vi.fn().mockResolvedValue({ id }), healthCheck: vi.fn() },
    skills: { getProgression: vi.fn().mockResolvedValue({ skills: [], progressions: [] }), getTeamProgress: vi.fn().mockResolvedValue([]), updateTeamProgress: vi.fn().mockResolvedValue({ id }), healthCheck: vi.fn() },
    goals: { getAgeGroupGoals: vi.fn().mockResolvedValue({ version: 1, goals: [] }), getTeamSeasonGoals: vi.fn().mockResolvedValue({ ageGroupGoalVersion: 1, goals: [], sources: [] }), saveTeamSeasonGoals: vi.fn().mockResolvedValue({ composition: { id }, goals: [] }), healthCheck: vi.fn() },
    programs: { createProgram: vi.fn().mockResolvedValue({ program: { id }, sessions: [] }), getProgram: vi.fn().mockResolvedValue({ id }), listSessions: vi.fn().mockResolvedValue([]), listTeamSessions: vi.fn().mockResolvedValue([]), getSession: vi.fn().mockResolvedValue(session), saveSession: vi.fn().mockImplementation(async (_id, s) => s), healthCheck: vi.fn() },
    teamAccess: { requireGoalWrite: vi.fn().mockResolvedValue(undefined), list: vi.fn().mockResolvedValue([]), assign: vi.fn(), unassign: vi.fn() },
    curriculum: { get: vi.fn().mockResolvedValue(null), save: vi.fn() },
    development: { get: vi.fn().mockResolvedValue(null), save: vi.fn() },
    developmentAssignments: { get: vi.fn().mockResolvedValue(null), save: vi.fn() },
    developmentSteering: { transitionCheck: vi.fn().mockResolvedValue({ transition: null, modelVersion: null, skills: [] }) },
  };
  registerServices(mocks);
});
async function call(name: string, options: { params?: Record<string, string>; query?: string; body?: unknown; raw?: string } = {}) {
  const registration = registrations.get(name)!;
  const req = new HttpRequest({ method: registration.methods[0], url: `http://localhost/api/${registration.route}${options.query ?? ''}`, params: options.params, body: options.raw !== undefined ? { string: options.raw } : options.body !== undefined ? { string: JSON.stringify(options.body) } : undefined });
  return registration.handler(req, new InvocationContext({ functionName: name }));
}
describe('Functions registration and contracts', () => {
  it('registers plan operations, OpenAPI and trainer assignment routes through the authorization wrapper', () => {
    expect(registrations.size).toBe(31);
    for (const value of registrations.values()) expect(value.authLevel).toBe('anonymous');
  });
  it('enforces goal writes and restricts trainer assignment management to committee members', async () => {
    const goalBody = { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [] };
    vi.mocked(mocks.teamAccess.requireGoalWrite).mockRejectedValue(new AppError('FORBIDDEN', 'Not assigned', 403));
    expect(await call('saveSeasonGoals', { params: { teamId: id, seasonId: id }, body: goalBody })).toMatchObject({ status: 403 });
    expect(mocks.goals.saveTeamSeasonGoals).not.toHaveBeenCalled();
    for (const name of ['listTeamAssignments', 'assignTeamTrainer', 'unassignTeamTrainer']) {
      expect(await call(name, { params: { teamId: id, objectId: id } })).toMatchObject({ status: 403 });
    }
    expect(mocks.teamAccess.assign).not.toHaveBeenCalled();
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    expect(await call('assignTeamTrainer', { params: { teamId: id, objectId: id } })).toMatchObject({ status: 204 });
    expect(mocks.teamAccess.assign).toHaveBeenCalledWith(id, id);
    expect(await call('unassignTeamTrainer', { params: { teamId: id, objectId: id } })).toMatchObject({ status: 204 });
    expect(await call('listTeamAssignments', { params: { teamId: id } })).toMatchObject({ status: 200, jsonBody: { assignments: [] } });
  });
  it('allows curriculum reads but only Committee can publish changes', async () => {
    const input = { expectedVersion: 0, goals: [{ text: 'Doel', skill_ids: ['catch'] }], skills: [{ id: 'catch', name: 'Vangen', description: 'Vangvaardigheid', level: 1, progression: 'Aanleren' }] };
    expect(await call('getCurriculum', { params: { ageGroupId: 'U12' } })).toMatchObject({ status: 200 });
    expect(await call('saveCurriculum', { params: { ageGroupId: 'U12' }, body: input })).toMatchObject({ status: 403 });
    expect(mocks.curriculum.save).not.toHaveBeenCalled();
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    vi.mocked(mocks.curriculum.save).mockResolvedValue({ age_group_id: 'U12', version: 1, goals: [{ id, ...input.goals[0] }], skills: input.skills });
    expect(await call('saveCurriculum', { params: { ageGroupId: 'U12' }, body: input })).toMatchObject({ status: 200 });
    expect(mocks.curriculum.save).toHaveBeenCalledWith('U12', 0, { goals: input.goals, skills: input.skills });
  });
  it('restricts development model edits and team goal edits', async () => {
    expect(await call('saveDevelopmentModel', { body: {} })).toMatchObject({ status: 403 });
    expect(mocks.development.save).not.toHaveBeenCalled();
    vi.mocked(mocks.teamAccess.requireGoalWrite).mockRejectedValue(new AppError('FORBIDDEN', 'Not assigned', 403));
    expect(await call('saveDevelopmentAssignments', { params: { teamId: id, seasonId: id }, body: {} })).toMatchObject({ status: 403 });
    expect(mocks.developmentAssignments.save).not.toHaveBeenCalled();
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    expect(await call('saveDevelopmentModel', { body: {} })).toMatchObject({ status: 422 });
    const model = developmentFixture();
    vi.mocked(mocks.development.save).mockResolvedValue({ version: 1, model, savedAt: '', savedBy: id });
    expect(await call('saveDevelopmentModel', { body: { expectedVersion: 0, model } })).toMatchObject({ status: 200 });
    expect(mocks.development.save).toHaveBeenCalledWith(0, model, id);
    mocks.teamAccess = new TeamAccessService(new MemoryRepository({ 'team-records': [
      { id: `trainer-${id}`, team_id: id, object_id: id, kind: 'trainer-assignment' },
    ] }));
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: false });
    vi.mocked(mocks.developmentAssignments.save).mockResolvedValue({ teamId: id, seasonId: id, version: 1, modelVersion: 1, assignments: [], savedAt: '', savedBy: id });
    expect(await call('saveDevelopmentAssignments', { params: { teamId: id, seasonId: id }, body: { expectedVersion: 0, modelVersion: 1, assignments: [] } })).toMatchObject({ status: 200 });
    const otherTeam = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
    expect(await call('saveDevelopmentAssignments', { params: { teamId: otherTeam, seasonId: id }, body: { expectedVersion: 0, modelVersion: 1, assignments: [] } })).toMatchObject({ status: 403 });
  });
  it('stores a model and assigned trainer choices through the registered endpoints', async () => {
    const seasonId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
    const repo = new MemoryRepository({ 'team-records': [
      { id: seasonId, team_id: id, kind: 'season', age_group_id: 'U12' },
      { id: `trainer-${id}`, team_id: id, object_id: id, kind: 'trainer-assignment' },
    ] });
    mocks.teamAccess = new TeamAccessService(repo);
    mocks.development = new DevelopmentService(repo);
    mocks.developmentAssignments = new DevelopmentAssignmentService(repo);
    const model = developmentFixture();
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    expect(await call('saveDevelopmentModel', { body: { expectedVersion: 0, model } })).toMatchObject({ status: 200, jsonBody: { development: { version: 1 } } });
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: false });
    const assignment = { id: 'choice', teamId: id, seasonId, ageGroupId: 'age_11_12', goalType: 'skill_goal', goalId: 'sg_age_11_12', active: true, priority: 2 };
    const input = { expectedVersion: 0, modelVersion: 1, assignments: [assignment] };
    expect(await call('saveDevelopmentAssignments', { params: { teamId: id, seasonId }, body: input })).toMatchObject({ status: 200, jsonBody: { developmentAssignments: { version: 1, assignments: [assignment] } } });
    expect(await call('getDevelopmentAssignments', { params: { teamId: id, seasonId } })).toMatchObject({ status: 200, jsonBody: { developmentAssignments: { modelVersion: 1, assignments: [assignment] } } });
    expect(await call('saveDevelopmentAssignments', { params: { teamId: id, seasonId }, body: input })).toMatchObject({ status: 409 });
  });
  it('restricts team administration and other team mutations', async () => {
    expect(await call('createTeam', { body: { name: 'Team', age_group_id: 'U12' } })).toMatchObject({ status: 403 });
    expect(await call('updateTeam', { params: { id }, body: { name: 'Team' } })).toMatchObject({ status: 403 });
    vi.mocked(mocks.teamAccess.requireGoalWrite).mockRejectedValue(new AppError('FORBIDDEN', 'Not assigned', 403));
    const settings = { startDate: '2026-01-06', day: 'dinsdag', time: '19:00', duration: 60, phase: 'winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false };
    expect(await call('createProgram', { body: { team_id: id, settings } })).toMatchObject({ status: 403 });
    expect(await call('createSeason', { params: { teamId: id }, body: { year: 2026, age_group_id: 'U12' } })).toMatchObject({ status: 403 });
    expect(await call('updateTeamSkillProgress', { params: { id, skillId: 'catch' }, body: { status: 'developing' } })).toMatchObject({ status: 403 });
    expect(await call('updateSessionCompletion', { params: { id }, body: { completed: true, completedItems: [] } })).toMatchObject({ status: 403 });
    expect(mocks.programs.createProgram).not.toHaveBeenCalled();
    expect(mocks.programs.saveSession).not.toHaveBeenCalled();
    expect(mocks.skills.updateTeamProgress).not.toHaveBeenCalled();
    expect(mocks.teams.createSeason).not.toHaveBeenCalled();
  });
  it('allows cross-team goal reads but only assigned team goal writes, including after removal', async () => {
    const otherTeam = 'ead8b42d-3e43-49b1-8204-ea1c88947490';
    const repo = new MemoryRepository({ 'team-records': [
      { id, team_id: id, kind: 'team' },
      { id: otherTeam, team_id: otherTeam, kind: 'team' },
    ] });
    const access = new TeamAccessService(repo);
    mocks.teamAccess = access;
    await access.assign(id, id);
    const goalBody = { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [] };
    expect(await call('getSeasonGoals', { params: { teamId: otherTeam, seasonId: id } })).toMatchObject({ status: 200 });
    expect(await call('saveSeasonGoals', { params: { teamId: id, seasonId: id }, body: goalBody })).toMatchObject({ status: 200 });
    expect(await call('saveSeasonGoals', { params: { teamId: otherTeam, seasonId: id }, body: goalBody })).toMatchObject({ status: 403 });
    expect(mocks.goals.saveTeamSeasonGoals).toHaveBeenCalledTimes(1);
    await access.unassign(id, id);
    expect(await call('saveSeasonGoals', { params: { teamId: id, seasonId: id }, body: goalBody })).toMatchObject({ status: 403 });
    expect(mocks.goals.saveTeamSeasonGoals).toHaveBeenCalledTimes(1);
  });
  it('rejects unauthorized calls before invoking a service', async () => {
    vi.mocked(authorizeRequest).mockRejectedValue(new AppError('UNAUTHORIZED', 'A valid access token is required', 401));
    for (const name of registrations.keys()) {
      expect(await call(name), name).toMatchObject({ status: 401, headers: { 'www-authenticate': 'Bearer' } });
    }
    expect(mocks.teams.listTeams).not.toHaveBeenCalled();
  });
  it('maps all health states and handles failing checks', async () => {
    expect((await call('health')).jsonBody.status).toBe('healthy');
    vi.mocked(mocks.hostStorage.healthCheck).mockRejectedValue(new Error('down'));
    expect(await call('health')).toMatchObject({ status: 200, jsonBody: { status: 'degraded' } });
    vi.mocked(mocks.cosmos.healthCheck).mockResolvedValue(false);
    expect(await call('health')).toMatchObject({ status: 503, jsonBody: { status: 'unhealthy' } });
  });
  it('returns all route shapes and statuses', async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    const settings = { startDate: '2026-01-06', day: 'dinsdag', time: '19:00', duration: 60, phase: 'winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false };
    const cases: Array<[string, any, number, string]> = [
      ['catalog', {}, 200, 'drills'], ['createProgram', { body: { team_id: id, settings } }, 201, 'program'],
      ['getProgram', { params: { id } }, 200, 'program'], ['getProgramSessions', { params: { id } }, 200, 'sessions'],
      ['updateSessionCompletion', { params: { id }, body: { completed: true, completedItems: ['x'] } }, 200, 'session'],
      ['listTeams', {}, 200, 'teams'], ['createTeam', { body: { name: 'Team', age_group_id: 'U12' } }, 201, 'team'],
      ['updateTeam', { params: { id }, body: { name: 'Team' } }, 200, 'team'],
      ['skillProgression', { query: '?age_group_id=U15' }, 200, 'progressions'],
      ['getTeamSkillProgress', { params: { id } }, 200, 'skillProgress'],
      ['updateTeamSkillProgress', { params: { id, skillId: 'catch' }, body: { status: 'developing' } }, 200, 'skillProgress'],
      ['getAgeGroupGoals', { params: { ageGroupId: 'U12' }, query: '?version=1' }, 200, 'goals'],
      ['createSeason', { params: { teamId: id }, body: { year: 2026, age_group_id: 'U12' } }, 201, 'teamSeason'],
      ['getSeasonGoals', { params: { teamId: id, seasonId: id } }, 200, 'sources'],
      ['saveSeasonGoals', { params: { teamId: id, seasonId: id }, body: { age_group_goal_version: 1, selected_generic_goal_ids: [], team_goals: [] } }, 200, 'composition'],
      ['getTransitionCheck', { params: { teamId: id, seasonId: id } }, 200, 'transitionCheck'],
      ['openapi', {}, 200, 'openapi'],
    ];
    for (const [name, options, status, key] of cases) expect(await call(name, options), name).toMatchObject({ status, jsonBody: { [key]: expect.anything() } });
    expect(await call('getSessionIcal', { params: { id } })).toMatchObject({ status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8' }, body: expect.stringContaining('DTEND:20260107T003000') });
  });
  it('validates path, query, bodies and malformed JSON consistently', async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ objectId: id, isCommittee: true });
    expect(await call('getProgram', { params: { id: 'bad' } })).toMatchObject({ status: 422, jsonBody: { error: { code: 'VALIDATION_ERROR' } } });
    expect(await call('skillProgression', { query: '?age_group_id=bad' })).toMatchObject({ status: 422, jsonBody: { error: { code: 'VALIDATION_ERROR' } } });
    expect(await call('createTeam', { body: { name: '', age_group_id: 'U12' } })).toMatchObject({ status: 422, jsonBody: { error: { code: 'VALIDATION_ERROR' } } });
    expect(await call('createTeam', { raw: '{' })).toMatchObject({ status: 400, jsonBody: { error: { code: 'BAD_REQUEST' } } });
  });
  it('returns 404 and sanitizes unexpected service failures', async () => {
    vi.mocked(mocks.programs.getProgram).mockResolvedValue(null);
    expect(await call('getProgram', { params: { id } })).toMatchObject({ status: 404, jsonBody: { error: { code: 'NOT_FOUND' } } });
    vi.mocked(mocks.teams.listTeams).mockRejectedValue(new Error('secret'));
    expect(await call('listTeams')).toMatchObject({ status: 500, jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } } });
  });
});
