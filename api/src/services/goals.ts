import { randomUUID } from 'node:crypto';
import type { AgeGroupGoal, ComposedGoal, GoalComposition, TeamGoal, TeamSeason } from '../../../shared/types/entities.js';
import type { IGoalsService } from './interfaces/IGoalsService.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/errorTypes.js';
import { REFERENCE, TEAM, clean, find, batchRecord, type BatchRepository } from './data.js';
import type { OperationInput } from '@azure/cosmos';
import { CurriculumService } from './curriculum.js';

export class GoalsService implements IGoalsService {
  constructor(private readonly repo: BatchRepository) {}
  async getAgeGroupGoals(ageGroupId: Parameters<IGoalsService['getAgeGroupGoals']>[0], version?: number) {
    const curriculum = await new CurriculumService(this.repo).get(ageGroupId, version);
    if (curriculum) return { version: curriculum.version, goals: curriculum.goals.map(goal => ({ ...goal, age_group_id: ageGroupId, version: curriculum.version })) };
    const all = await find<AgeGroupGoal>(this.repo, REFERENCE, 'age-goal', { age_group_id: ageGroupId });
    const selected = version ?? Math.max(0, ...all.map(g => g.version));
    const goals = all.filter(g => g.version === selected);
    return goals.length ? { version: selected, goals } : null;
  }
  private async season(teamId: string, seasonId: string): Promise<TeamSeason> {
    const season = await this.repo.getById<TeamSeason>(TEAM, seasonId, teamId);
    if (!season || season.team_id !== teamId || (season as TeamSeason & { kind?: string }).kind !== 'season') throw new NotFoundError('Season', seasonId);
    return clean(season);
  }
  async getTeamSeasonGoals(teamId: string, seasonId: string) {
    await this.season(teamId, seasonId);
    const composition = await this.repo.getById<GoalComposition>(TEAM, `composition-${seasonId}`, teamId);
    if (!composition) return null;
    return { ageGroupGoalVersion: composition.age_group_goal_version, goals: composition.goals, sources: [...new Set(composition.goals.map(g => g.source))] };
  }
  async saveTeamSeasonGoals(teamId: string, seasonId: string, input: Parameters<IGoalsService['saveTeamSeasonGoals']>[2]) {
    const season = await this.season(teamId, seasonId);
    const generic = await this.getAgeGroupGoals(season.age_group_id, input.age_group_goal_version);
    if (!generic) throw new NotFoundError('Age group goal version', String(input.age_group_goal_version));
    const selected = [...new Set(input.selected_generic_goal_ids)];
    const indexed = new Map(generic.goals.map(g => [g.id, g]));
    if (selected.some(id => !indexed.has(id))) throw new ValidationError('Selected goal does not belong to this age group and version');
    const suppliedIds = input.team_goals.flatMap(g => g.id ? [g.id] : []);
    if (new Set(suppliedIds).size !== suppliedIds.length || suppliedIds.some(id => indexed.has(id))) throw new ConflictError('Duplicate goal ID');
    const existing = await this.repo.getById<GoalComposition & { _etag?: string }>(TEAM, `composition-${seasonId}`, teamId);
    const old = await find<TeamGoal>(this.repo, TEAM, 'team-goal', { team_id: teamId, season_id: seasonId }, teamId);
    const oldIds = new Set(old.map(g => g.id));
    for (const id of suppliedIds) {
      if (!oldIds.has(id) && await this.repo.getById(TEAM, id, teamId)) throw new ConflictError('Goal ID already exists');
    }
    const teamGoals: TeamGoal[] = input.team_goals.map(g => ({ id: g.id ?? randomUUID(), team_id: teamId, season_id: seasonId, text: g.text, skill_ids: [...new Set(g.skill_ids)] }));
    const goals: ComposedGoal[] = [
      ...selected.map(id => { const g = indexed.get(id)!; return { id, text: g.text, skill_ids: g.skill_ids, source: 'generiek' as const, generic_goal_version: generic.version, team_id: teamId, season_id: seasonId }; }),
      ...teamGoals.map(g => ({ ...g, source: 'team' as const })),
    ];
    const composition: GoalComposition = { id: `composition-${seasonId}`, team_id: teamId, season_id: seasonId, age_group_goal_version: generic.version, goals, selected_generic_goal_ids: selected, team_goal_ids: teamGoals.map(g => g.id), created_at: new Date().toISOString() };
    const retained = new Set(teamGoals.map(g => g.id));
    const compositionOperation: OperationInput = existing
      ? { operationType: 'Replace', id: composition.id, resourceBody: batchRecord('composition', teamId, composition), ...(existing._etag ? { ifMatch: existing._etag } : {}) }
      : { operationType: 'Create', resourceBody: batchRecord('composition', teamId, composition) };
    const operations: OperationInput[] = [
      compositionOperation,
      ...old.filter(g => !retained.has(g.id)).map(g => ({ operationType: 'Delete' as const, id: g.id })),
      ...teamGoals.map(g => oldIds.has(g.id)
        ? { operationType: 'Replace' as const, id: g.id, resourceBody: batchRecord('team-goal', teamId, g) }
        : { operationType: 'Create' as const, resourceBody: batchRecord('team-goal', teamId, g) }),
    ];
    if (operations.length > 100) throw new ValidationError('Too many goal changes for one atomic operation');
    try { await this.repo.batch(TEAM, teamId, operations); }
    catch (error) {
      if ([409, 412].includes((error as { code?: number }).code ?? 0)) throw new ConflictError('Goals changed concurrently; reload and retry');
      throw error;
    }
    return { composition, goals };
  }
  healthCheck(): Promise<boolean> { return this.repo.healthCheck(); }
}
