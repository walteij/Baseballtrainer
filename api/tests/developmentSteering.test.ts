import { beforeEach, describe, expect, it } from 'vitest';
import { ProgramService } from '../src/services/programs.js';
import { CatalogService } from '../src/services/catalog.js';
import { SkillService } from '../src/services/skills.js';
import { DevelopmentService } from '../src/services/development.js';
import { DevelopmentAssignmentService } from '../src/services/developmentAssignments.js';
import { DevelopmentSteeringService } from '../src/services/developmentSteering.js';
import { developmentFixture } from './developmentFixture.js';
import { MemoryRepository } from './memory.js';

const user = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23420';
const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
const season2026 = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23423';
const season2027 = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23425';
const criterion = { id: 'mc_fixture', description: { nl: 'Oefen' }, measurementType: 'observation', target: { required: true }, evidence: ['coach_observation'] };
const settings = { day: 'dinsdag', time: '19:00', duration: 15, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false };

function model() {
  const value = JSON.parse(JSON.stringify(developmentFixture())) as { taxonomy: { skills: { ageProgressions: object[] }[] }[] };
  const progressions = (skill: string, levels: Record<string, string>) => Object.entries(levels)
    .map(([band, level]) => ({ id: `prog_${skill}_${band}`, ageGroupId: band, level, goal: { nl: `Volgende stap ${skill}` }, masteryCriteria: [criterion], editable: true }));
  value.taxonomy[0].skills[0].ageProgressions = progressions('hit_fixture', { age_6_8: 'foundation', age_9_10: 'foundation', age_11_12: 'foundation', age_13_15: 'developing' });
  value.taxonomy[1].skills[0].ageProgressions = progressions('pitch_fixture', { age_9_10: 'introduction', age_11_12: 'introduction', age_13_15: 'foundation' });
  return value;
}

let repo: MemoryRepository;
beforeEach(async () => {
  repo = new MemoryRepository({
    'team-records': [
      { kind: 'team', id: teamId, team_id: teamId, name: 'Team A', age_group_id: 'U12' },
      { kind: 'season', id: season2026, team_id: teamId, year: 2026, age_group_id: 'U12' },
      { kind: 'season', id: season2027, team_id: teamId, year: 2027, age_group_id: 'U15' },
    ],
    'reference-data': [
      { kind: 'skill', id: 'catch', name: 'Vangen', description: 'Basis' },
      { kind: 'progression', id: 'p1', skill_id: 'catch', age_group_id: 'U12', version: 1, level: 1, description: 'Basis' },
      { kind: 'catalog', id: 'catalog', drills: [
        { id: 'd1', name_nl: 'Werpen', category: 'throwing', skills: ['catch'], equipment_required: [], indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: 10, minimum: 10, maximum: 10 }, selection: { minimum_repeat_gap_days: 0 } },
        { id: 'd2', name_nl: 'Slaan', category: 'batting', skills: ['catch'], equipment_required: [], indoor_friendly: true, space_required: 'zaal', duration_minutes: { default: 10, minimum: 10, maximum: 10 }, selection: { minimum_repeat_gap_days: 0 } },
      ], categories: {}, warmup: { duration_minutes: 5, blocks: [] } },
    ],
  });
  await new DevelopmentService(repo).save(0, model(), user);
});
const programs = () => new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
const saveAssignments = (seasonId: string, assignments: object[]) =>
  new DevelopmentAssignmentService(repo).save(teamId, seasonId, { expectedVersion: 0, modelVersion: 1, assignments }, user);

describe('development steering of the program generator', () => {
  it.each([
    { kind: 'skill_goal', assignment: { goalType: 'skill_goal', goalId: 'sg_age_11_12', ageGroupId: 'age_11_12' } },
    { kind: 'club_goal', assignment: { goalType: 'club_goal', goalId: 'cg_fixture', ageGroupId: 'age_6_8' } },
  ])('prefers drills in categories of active $kind assignments and records the steering', async ({ assignment }) => {
    await saveAssignments(season2026, [{ id: 'choice', teamId, seasonId: season2026, active: true, priority: 1, ...assignment }]);
    const result = await programs().createProgram(teamId, { ...settings, startDate: '2026-01-05' });
    expect(result.program.development).toEqual({ season_id: season2026, model_version: 1, assignments_version: 1, categories: ['batting'] });
    expect(result.sessions.every(s => s.blocks.some(b => b.drill_id === 'd2'))).toBe(true);
    expect(result.sessions.flatMap(s => s.blocks).map(b => b.drill_id)).not.toContain('d1');
  });
  it('keeps catalog order and omits steering metadata without a matching season or active assignments', async () => {
    const noSeason = await programs().createProgram(teamId, { ...settings, startDate: '2028-01-03' });
    expect(noSeason.program.development).toBeUndefined();
    expect(noSeason.sessions[0].blocks.some(b => b.drill_id === 'd1')).toBe(true);
    await saveAssignments(season2027, [{ id: 'choice', teamId, seasonId: season2027, ageGroupId: 'age_11_12', goalType: 'skill_goal', goalId: 'sg_age_11_12', active: false, priority: 1 }]);
    const inactive = await programs().createProgram(teamId, { ...settings, startDate: '2027-01-04' });
    expect(inactive.program.development).toBeUndefined();
    expect(inactive.sessions[0].blocks.some(b => b.drill_id === 'd1')).toBe(true);
  });
});

describe('age-group transition check', () => {
  it('reports no transition without a previous season or when the age group is unchanged', async () => {
    const svc = new DevelopmentSteeringService(repo);
    expect(await svc.transitionCheck(teamId, season2026)).toEqual({ transition: null, modelVersion: null, skills: [] });
    repo.data.get('team-records')!.find(d => d.id === season2027)!.age_group_id = 'U12';
    expect((await svc.transitionCheck(teamId, season2027)).transition).toBeNull();
    await expect(svc.transitionCheck(teamId, 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23499')).rejects.toMatchObject({ status: 404 });
  });
  it('lists carry-over skills with levels and marks coverage by active season goals', async () => {
    const svc = new DevelopmentSteeringService(repo);
    const before = await svc.transitionCheck(teamId, season2027);
    expect(before.transition).toEqual({ from: 'U12', to: 'U15' });
    expect(before.modelVersion).toBe(1);
    expect(before.skills).toEqual([
      expect.objectContaining({ id: 'hit_fixture', category: 'hitting', previousLevel: 'foundation', nextLevel: 'developing', covered: false }),
      expect.objectContaining({ id: 'pitch_fixture', category: 'pitching', previousLevel: 'introduction', nextLevel: 'foundation', covered: false }),
    ]);
    await saveAssignments(season2027, [{ id: 'choice', teamId, seasonId: season2027, ageGroupId: 'age_11_12', goalType: 'skill_goal', goalId: 'sg_age_11_12', active: true, priority: 2 }]);
    const after = await svc.transitionCheck(teamId, season2027);
    expect(after.skills.find(s => s.id === 'hit_fixture')?.covered).toBe(true);
    expect(after.skills.find(s => s.id === 'pitch_fixture')?.covered).toBe(false);
  });
});
