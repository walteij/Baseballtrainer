export type AgeGroupId = 'Beeball' | 'U12' | 'U15' | 'U21' | 'Senioren';
export type GoalSource = 'generiek' | 'team';
export type SkillProgressStatus = 'introduced' | 'developing' | 'proficient';

export interface Drill {
  id: string;
  name_nl: string;
  category: string;
  subcategories: string[];
  skills: string[];
  duration_minutes: { default: number; minimum: number; maximum: number };
  players_min: number;
  players_max: number;
  equipment_required: string[];
  equipment_optional: string[];
  indoor_friendly: boolean;
  space_required: string;
  difficulty: string;
  description: string;
  setup: string[];
  execution: string[];
  coaching_points: string[];
  common_mistakes: string[];
  safety_notes: string[];
  variations: { name: string; difficulty: string; description: string }[];
  youtube: { url: string; title: string; start_seconds: number } | null;
  selection: { minimum_repeat_gap_days: number; preferred_session_blocks: string[] };
}

export interface Warmup {
  duration_minutes: number;
  blocks: { name: string; duration_minutes: number; items: string[] }[];
}

export interface Catalog {
  drills: Drill[];
  categories: Record<string, string[]>;
  warmup: Warmup;
}

export interface Team {
  id: string;
  name: string;
  age_group_id: AgeGroupId;
  created_at?: string;
  updated_at?: string;
}

export interface TeamSeason {
  id: string;
  team_id: string;
  year: number;
  age_group_id: AgeGroupId;
  name?: string;
  created_at?: string;
}

export interface AgeGroupGoal {
  id: string;
  age_group_id: AgeGroupId;
  version: number;
  text: string;
  skill_ids: string[];
}

export interface TeamGoal {
  id: string;
  team_id: string;
  season_id: string;
  text: string;
  skill_ids: string[];
}

export interface ComposedGoal {
  id: string;
  text: string;
  source: GoalSource;
  generic_goal_version?: number;
  season_id: string;
  team_id: string;
  skill_ids: string[];
}

export interface GoalComposition {
  id: string;
  team_id: string;
  season_id: string;
  age_group_goal_version: number;
  goals: ComposedGoal[];
  selected_generic_goal_ids: string[];
  team_goal_ids: string[];
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
}

export interface SkillProgression {
  id: string;
  skill_id: string;
  age_group_id: AgeGroupId;
  level: number;
  description: string;
  version: number;
}

export interface TeamSkillProgress {
  id: string;
  team_id: string;
  skill_id: string;
  status: SkillProgressStatus;
  notes?: string;
  updated_at: string;
}

export interface ProgramSettings {
  startDate: string;
  day: string;
  time: string;
  duration: number;
  phase: string;
  location: string;
  equipment: string[];
  field: boolean;
  cage: boolean;
  mound: boolean;
}

export interface Program {
  id: string;
  team_id: string;
  settings: ProgramSettings;
  created_at: string;
}

export interface SessionBlock {
  id: string;
  time: string;
  title: string;
  minutes: number;
  detail: string;
  drill_id?: string;
}

export interface Session {
  id: string;
  team_id: string;
  program_id: string;
  title: string;
  date: string;
  time: string;
  end: string;
  phase: string;
  location: string;
  focus: string;
  blocks: SessionBlock[];
  completed: boolean;
  completed_items: string[];
  equipment: string[];
}
