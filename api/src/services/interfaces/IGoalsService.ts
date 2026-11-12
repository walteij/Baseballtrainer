import type {
  AgeGroupGoal,
  AgeGroupId,
  ComposedGoal,
  GoalComposition,
  TeamGoal,
} from '../../../../shared/types/entities.js';

export interface IGoalsService {
  getAgeGroupGoals(ageGroupId: AgeGroupId, version?: number): Promise<{ version: number; goals: AgeGroupGoal[] } | null>;
  getTeamSeasonGoals(
    teamId: string,
    seasonId: string,
  ): Promise<{ ageGroupGoalVersion: number; goals: ComposedGoal[]; sources: string[] } | null>;
  saveTeamSeasonGoals(
    teamId: string,
    seasonId: string,
    input: {
      age_group_goal_version: number;
      selected_generic_goal_ids: string[];
      team_goals: Array<{ id?: string; text: string; skill_ids: string[] }>;
    },
  ): Promise<{ composition: GoalComposition; goals: ComposedGoal[] }>;
  healthCheck(): Promise<boolean>;
}

export interface ITeamGoalRepository {
  getBySeason(teamId: string, seasonId: string): Promise<TeamGoal[]>;
}
