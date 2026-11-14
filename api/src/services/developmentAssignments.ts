import type { TeamSeason } from '../../../shared/types/entities.js';
import { developmentBandsForCategory } from '../../../shared/types/developmentAgeGroups.js';
import { SaveDevelopmentAssignmentsSchema, type DevelopmentAssignment } from '../../../shared/schemas/developmentAssignment.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/errorTypes.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { TEAM } from './data.js';
import { DevelopmentService } from './development.js';

export interface DevelopmentAssignments {
  teamId: string;
  seasonId: string;
  version: number;
  modelVersion: number;
  assignments: DevelopmentAssignment[];
  savedAt: string;
  savedBy: string;
}

export class DevelopmentAssignmentService {
  constructor(private readonly repo: ICosmosRepository) {}

  private async season(teamId: string, seasonId: string): Promise<TeamSeason> {
    const season = await this.repo.getById<TeamSeason & { kind?: string }>(TEAM, seasonId, teamId);
    if (!season || season.kind !== 'season' || season.team_id !== teamId) throw new NotFoundError('Season', seasonId);
    return season;
  }

  async get(teamId: string, seasonId: string): Promise<DevelopmentAssignments | null> {
    await this.season(teamId, seasonId);
    const records = await this.repo.query<{ version: number }>(TEAM, {
      query: 'SELECT c.version FROM c WHERE c.kind = @p0 AND c.seasonId = @p1',
      parameters: [{ name: '@p0', value: 'development-assignments' }, { name: '@p1', value: seasonId }],
      partitionKey: teamId,
    });
    const selected = Math.max(0, ...records.map(record => record.version));
    if (!selected) return null;
    const record = await this.repo.getById<DevelopmentAssignments & { kind: string }>(TEAM, `development-assignments-${seasonId}-${selected}`, teamId);
    if (!record || record.kind !== 'development-assignments' || record.version !== selected || record.teamId !== teamId || record.seasonId !== seasonId) {
      throw new Error('Invalid development assignment version record');
    }
    const { version, modelVersion, assignments, savedAt, savedBy } = record;
    return { teamId, seasonId, version, modelVersion, assignments, savedAt, savedBy };
  }

  async save(teamId: string, seasonId: string, input: unknown, userId: string): Promise<DevelopmentAssignments> {
    const parsed = SaveDevelopmentAssignmentsSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError(`Invalid development assignments: ${parsed.error.message}`);
    const { expectedVersion, modelVersion, assignments } = parsed.data;
    const season = await this.season(teamId, seasonId);
    const current = await this.get(teamId, seasonId);
    if ((current?.version ?? 0) !== expectedVersion) throw new ConflictError('Development assignments changed; reload and retry');
    const model = await new DevelopmentService(this.repo).get(modelVersion);
    if (!model) throw new NotFoundError('Development model version', String(modelVersion));
    const ages = new Set(developmentBandsForCategory(season.age_group_id, model.model.ageGroups).map(age => age.id));
    const ids = new Set<string>();
    const choices = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.teamId !== teamId || assignment.seasonId !== seasonId) throw new ValidationError('Assignment belongs to another team or season');
      if (ids.has(assignment.id)) throw new ValidationError('Duplicate assignment ID');
      ids.add(assignment.id);
      const key = `${assignment.goalType}:${assignment.goalId}`;
      if (choices.has(key)) throw new ValidationError('Duplicate assigned goal');
      choices.add(key);
      const goal = assignment.goalType === 'skill_goal'
        ? model.model.skillGoals.find(item => item.id === assignment.goalId)
        : model.model.clubGoals.find(item => item.id === assignment.goalId);
      if (!goal || goal.ageGroupId !== assignment.ageGroupId || !ages.has(goal.ageGroupId)) {
        throw new ValidationError('Goal does not belong to an applicable age band in this model version');
      }
      if (goal.status === 'archived' && assignment.active) throw new ValidationError('Archived goals cannot be active');
    }
    const result: DevelopmentAssignments = {
      teamId, seasonId, version: expectedVersion + 1, modelVersion, assignments,
      savedAt: new Date().toISOString(), savedBy: userId,
    };
    try {
      await this.repo.create(TEAM, {
        ...result, id: `development-assignments-${seasonId}-${result.version}`, kind: 'development-assignments', team_id: teamId,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 409) throw new ConflictError('Development assignments changed; reload and retry');
      throw error;
    }
    return result;
  }
}
