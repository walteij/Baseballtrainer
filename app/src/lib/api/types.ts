import type { DevelopmentModel } from '../../../../shared/schemas/development.js';
import type { DevelopmentAssignment, SaveDevelopmentAssignments } from '../../../../shared/schemas/developmentAssignment.js';

export type { DevelopmentModel, DevelopmentAssignment, SaveDevelopmentAssignments };
export type AgeGroup = 'Beeball' | 'U12' | 'U15' | 'U21' | 'Senioren';
export interface Team { id: string; name: string; age_group_id: AgeGroup }
export interface Drill {
  id: string; name_nl: string; category: string; subcategories: string[]; skills: string[];
  duration_minutes: { default: number; minimum: number; maximum: number };
  players_min: number; players_max: number; equipment_required: string[]; equipment_optional: string[];
  indoor_friendly: boolean; space_required: string; difficulty: string; description: string;
  setup: string[]; execution: string[]; coaching_points: string[]; common_mistakes: string[];
  safety_notes: string[]; variations: { name: string; difficulty: string; description: string }[];
  youtube: { url: string; title: string; start_seconds: number } | null;
  selection: { minimum_repeat_gap_days: number; preferred_session_blocks: string[] };
}
export interface Warmup { duration_minutes: number; blocks: { name: string; duration_minutes: number; items: string[] }[] }
export interface Catalog { drills: Drill[]; categories: Record<string, string[]>; warmup: Warmup }
export interface SessionBlock { time: string; title: string; minutes: number; detail: string; drillId?: string }
export interface Session { id: string; team_id: string; title: string; date: string; time: string; end: string; phase: string; location: string; focus: string; blocks: SessionBlock[]; completed: boolean; equipment: string[] }
export interface Skill { id: string; name: string; description: string }
export interface Goal { id: string; text: string; source: 'generiek' | 'team'; version?: number; skill_ids: string[] }
export interface Settings { startDate: string; day: string; time: string; duration: number; phase: string; location: string; equipment: string[]; field: boolean; cage: boolean; mound: boolean }
export interface Program { id: string; team_id: string; settings: Settings }
export interface TeamSeason { id: string; team_id: string; year: number; age_group_id: AgeGroup }
export interface CurriculumSkill { id: string; name: string; description: string; level: number; progression: string }
export interface CurriculumGoal { id?: string; text: string; skill_ids: string[] }
export interface Curriculum { age_group_id: AgeGroup; version: number; goals: CurriculumGoal[]; skills: CurriculumSkill[] }
export interface DevelopmentVersion { version: number; model: DevelopmentModel; savedAt: string; savedBy: string }
export interface DevelopmentAssignments {
  teamId: string; seasonId: string; version: number; modelVersion: number;
  assignments: DevelopmentAssignment[]; savedAt: string; savedBy: string;
}
export interface TransitionSkillReport {
  id: string; name: string; category: string;
  previousLevel: string; nextLevel: string; nextGoal: string; covered: boolean;
}
export interface TransitionCheck {
  transition: { from: AgeGroup; to: AgeGroup } | null;
  modelVersion: number | null;
  skills: TransitionSkillReport[];
}
export interface ApiClient {
  health(): Promise<{ status: string; services: string[] }>;
  getCatalog(): Promise<Catalog>;
  createProgram(teamId: string, settings: Settings): Promise<{ program: Program; sessions: Session[] }>;
  getProgram(id: string): Promise<Program | null>;
  listProgramSessions(id: string): Promise<Session[]>;
  updateSessionCompletion(id: string, completed: boolean, completedItems: string[]): Promise<Session>;
  getSessionIcal(id: string): Promise<string>;
  listTeams(): Promise<Team[]>;
  createTeam(input: { name: string; age_group_id: AgeGroup }): Promise<Team>;
  updateTeam(id: string, input: Partial<Pick<Team, 'name' | 'age_group_id'>>): Promise<Team>;
  getSkillProgression(ageGroup: AgeGroup): Promise<{ skills: Skill[]; progressions: string[] }>;
  getTeamSkillProgress(teamId: string): Promise<Skill[]>;
  updateTeamSkillProgress(teamId: string, skillId: string, status: string, notes?: string): Promise<Skill>;
  getAgeGroupGoals(ageGroup: AgeGroup, version?: number): Promise<{ ageGroupId: AgeGroup; version: number; goals: Goal[] } | null>;
  createTeamSeason(teamId: string, input: { year: number; age_group_id: AgeGroup; name?: string }): Promise<TeamSeason>;
  listTeamSeasons(teamId: string): Promise<TeamSeason[]>;
  getTeamSeasonGoals(teamId: string, seasonId: string): Promise<{ ageGroupGoalVersion: number; goals: Goal[]; sources: string[] } | null>;
  saveTeamSeasonGoals(teamId: string, seasonId: string, input: { age_group_goal_version: number; selected_generic_goal_ids: string[]; team_goals: Goal[] }): Promise<{ goals: Goal[] }>;
  listTeamSessions(teamId: string): Promise<Session[]>;
  getSettings(teamId: string): Promise<Settings>;
  saveSettings(teamId: string, settings: Settings): Promise<Settings>;
  getIdentity(): Promise<{ objectId: string; isCommittee: boolean }>;
  listAssignments(teamId: string): Promise<{ objectId: string }[]>;
  assignTrainer(teamId: string, objectId: string): Promise<void>;
  unassignTrainer(teamId: string, objectId: string): Promise<void>;
  getCurriculum(ageGroup: AgeGroup): Promise<Curriculum | null>;
  saveCurriculum(ageGroup: AgeGroup, input: { expectedVersion: number; goals: CurriculumGoal[]; skills: CurriculumSkill[] }): Promise<Curriculum>;
  getDevelopment(version?: number): Promise<DevelopmentVersion | null>;
  saveDevelopment(expectedVersion: number, model: DevelopmentModel): Promise<DevelopmentVersion>;
  getDevelopmentAssignments(teamId: string, seasonId: string): Promise<DevelopmentAssignments | null>;
  saveDevelopmentAssignments(teamId: string, seasonId: string, input: SaveDevelopmentAssignments): Promise<DevelopmentAssignments>;
  getTransitionCheck(teamId: string, seasonId: string): Promise<TransitionCheck>;
}
