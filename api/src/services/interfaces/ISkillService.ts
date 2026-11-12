import type {
  AgeGroupId,
  Skill,
  SkillProgression,
  TeamSkillProgress,
} from '../../../../shared/types/entities.js';

export interface ISkillService {
  getProgression(ageGroupId: AgeGroupId): Promise<{ skills: Skill[]; progressions: SkillProgression[] }>;
  getTeamProgress(teamId: string): Promise<TeamSkillProgress[]>;
  updateTeamProgress(
    teamId: string,
    skillId: string,
    input: { status: TeamSkillProgress['status']; notes?: string },
  ): Promise<TeamSkillProgress | null>;
  healthCheck(): Promise<boolean>;
}
