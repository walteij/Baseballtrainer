import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DevelopmentModelSchema } from '../../shared/schemas/development.js';
import { developmentBandsForCategory } from '../../shared/types/developmentAgeGroups.js';
import { DevelopmentService } from '../src/services/development.js';
import { DevelopmentAssignmentService } from '../src/services/developmentAssignments.js';
import { MemoryRepository } from './memory.js';
import { developmentFixture } from './developmentFixture.js';

const seedFile = new URL('../../data/nl/goals/baseball-development.seed.json', import.meta.url);

describe('development model', () => {
  it.skipIf(!existsSync(seedFile))('validates the complete supplied seed, retaining draft status and rich fields', async () => {
    const raw: unknown = JSON.parse(await readFile(seedFile, 'utf8'));
    const model = DevelopmentModelSchema.parse(raw);
    expect(model).toEqual(raw);
    expect(model.taxonomy).toHaveLength(10);
    expect(model.taxonomy.flatMap(category => category.skills)).toHaveLength(45);
    expect(model.skillGoals).toHaveLength(50);
    expect(model.clubGoals).toHaveLength(5);
    expect([...model.skillGoals, ...model.clubGoals].every(goal => goal.status === 'draft')).toBe(true);
    expect(model.skillGoals[0].masteryCriteria[0].target).toEqual({ successfulAttempts: 8, totalAttempts: 10 });
    expect(developmentBandsForCategory('U12', model.ageGroups).map(group => group.name)).toEqual(['6-8 jaar', '9-10 jaar', '11-12 jaar']);
  });

  it('rejects invalid references, duplicated IDs, and reversed age boundaries', async () => {
    const model = developmentFixture();
    model.skillGoals[0].skillIds.push('hit_unknown');
    model.clubGoals[0].skillGoalIds.push('sg_unknown');
    model.ageGroups[0].maxAge = 5;
    model.taxonomy[1].skills[0].id = model.taxonomy[0].skills[0].id;
    const result = DevelopmentModelSchema.safeParse(model);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected validation errors');
    expect(result.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining([
      'skillGoals.0.skillIds', 'clubGoals.0.skillGoalIds', 'ageGroups.0.maxAge', 'taxonomy',
    ]));
  });

  it('creates immutable versions without changing existing curriculum and rejects stale writes', async () => {
    const model = developmentFixture();
    const repo = new MemoryRepository({ 'reference-data': [{ id: 'existing', pk: 'curriculum:U12', kind: 'curriculum', version: 1 }] });
    const service = new DevelopmentService(repo);
    const first = await service.save(0, model, 'tc');
    model.skillGoals[0].name.nl = 'Aangepast doel';
    const second = await service.save(1, model, 'tc');
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect((await service.get(1))?.model.skillGoals[0].name.nl).not.toBe('Aangepast doel');
    expect((await service.get())?.model.skillGoals[0].name.nl).toBe('Aangepast doel');
    await expect(service.save(1, model, 'tc')).rejects.toThrow('changed');
    expect(await repo.getById('reference-data', 'existing', 'curriculum:U12')).toMatchObject({ version: 1 });
  });

  it('allows only one concurrent initial import', async () => {
    const model = developmentFixture();
    const service = new DevelopmentService(new MemoryRepository());
    const results = await Promise.allSettled([service.save(0, model, 'a'), service.save(0, model, 'b')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });

  it('pins team selections to a model version, preserves old goals and checks category and concurrency', async () => {
    const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
    const seasonId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
    const repo = new MemoryRepository({ 'team-records': [
      { id: seasonId, team_id: teamId, kind: 'season', age_group_id: 'U12' },
      { id: 'existing-goal', team_id: teamId, kind: 'team-goal', text: 'Behouden' },
    ] });
    const development = new DevelopmentService(repo);
    const assignments = new DevelopmentAssignmentService(repo);
    const model = developmentFixture();
    await development.save(0, model, 'tc');
    const goal = model.skillGoals.find(item => item.ageGroupId === 'age_11_12')!;
    const originalName = goal.name.nl;
    const assignment = {
      id: 'one', teamId, seasonId, ageGroupId: goal.ageGroupId, goalId: goal.id,
      goalType: 'skill_goal' as const, active: true, priority: 2,
      overrides: { name: 'Onze versie', masteryTargetPercentage: 80 },
    };
    const input = { expectedVersion: 0, modelVersion: 1, assignments: [assignment] };
    await assignments.save(teamId, seasonId, input, 'coach');
    model.skillGoals.find(item => item.id === goal.id)!.name.nl = 'Centrale wijziging';
    await development.save(1, model, 'tc');
    const saved = await assignments.get(teamId, seasonId);
    expect(saved).toMatchObject({ version: 1, modelVersion: 1, assignments: [assignment] });
    expect((await development.get(saved!.modelVersion))?.model.skillGoals.find(item => item.id === goal.id)?.name.nl).toBe(originalName);
    await expect(assignments.save(teamId, seasonId, input, 'coach')).rejects.toThrow('changed');
    const wrongAge = model.skillGoals.find(item => item.ageGroupId === 'age_16_plus')!;
    await expect(assignments.save(teamId, seasonId, { ...input, expectedVersion: 1, assignments: [
      { ...assignment, ageGroupId: wrongAge.ageGroupId, goalId: wrongAge.id },
    ] }, 'coach')).rejects.toThrow('applicable age band');
    await expect(assignments.save(teamId, seasonId, { ...input, expectedVersion: 1, assignments: [assignment, { ...assignment, id: 'two' }] }, 'coach')).rejects.toThrow('Duplicate');
    expect(await repo.getById('team-records', 'existing-goal', teamId)).toMatchObject({ text: 'Behouden' });
  });

  it('rejects concurrent team edits and does not change the pinned model', async () => {
    const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
    const seasonId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
    const repo = new MemoryRepository({ 'team-records': [{ id: seasonId, team_id: teamId, kind: 'season', age_group_id: 'U12' }] });
    await new DevelopmentService(repo).save(0, developmentFixture(), 'tc');
    const service = new DevelopmentAssignmentService(repo);
    const input = { expectedVersion: 0, modelVersion: 1, assignments: [] };
    const results = await Promise.allSettled([service.save(teamId, seasonId, input, 'coach-a'), service.save(teamId, seasonId, input, 'coach-b')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await service.get(teamId, seasonId)).toMatchObject({ version: 1, modelVersion: 1 });
  });
});
