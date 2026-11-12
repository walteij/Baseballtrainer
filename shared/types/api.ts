import type {
  AgeGroupGoal,
  AgeGroupId,
  Catalog,
  ComposedGoal,
  GoalComposition,
  Program,
  ProgramSettings,
  Session,
  Skill,
  SkillProgression,
  Team,
  TeamSeason,
  TeamSkillProgress,
} from './entities.js';

export interface CreateProgramRequest {
  team_id: string;
  settings: ProgramSettings;
}

export interface CreateProgramResponse {
  program: Program;
  sessions: Session[];
}

export interface UpdateSessionCompletionRequest {
  completed: boolean;
  completedItems: string[];
}

export interface CreateTeamRequest {
  name: string;
  age_group_id: AgeGroupId;
}

export interface UpdateTeamRequest {
  name?: string;
  age_group_id?: AgeGroupId;
}

export interface CreateTeamSeasonRequest {
  year: number;
  age_group_id: AgeGroupId;
  name?: string;
}

export interface SaveTeamSeasonGoalsRequest {
  age_group_goal_version: number;
  selected_generic_goal_ids: string[];
  team_goals: Array<{ id?: string; text: string; skill_ids: string[] }>;
}

export interface CatalogResponse extends Catalog {}
export interface CreateProgramResult extends CreateProgramResponse {}
export interface ProgramResponse { program: Program }
export interface ProgramSessionsResponse { sessions: Session[] }
export interface SessionResponse { session: Session }
export interface TeamsResponse { teams: Team[] }
export interface TeamResponse { team: Team }
export interface SkillProgressionResponse { skills: Skill[]; progressions: SkillProgression[] }
export interface TeamSkillProgressResponse { skillProgress: TeamSkillProgress[] }
export interface AgeGroupGoalsResponse {
  ageGroupId: AgeGroupId;
  version: number;
  goals: AgeGroupGoal[];
}
export interface TeamSeasonResponse { teamSeason: TeamSeason }
export interface TeamSeasonGoalsResponse {
  ageGroupGoalVersion: number;
  goals: ComposedGoal[];
  sources: string[];
}
export interface SaveTeamSeasonGoalsResponse {
  composition: GoalComposition;
  goals: ComposedGoal[];
}
export interface IcalResponse { contentType: 'text/calendar'; body: string }
