import type { Skill, SkillProgression, TeamSkillProgress } from '../../../shared/types/entities.js';
import type { ISkillService } from './interfaces/ISkillService.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { REFERENCE, TEAM, clean, find, record } from './data.js';
import { NotFoundError } from '../errors/errorTypes.js';
import { CurriculumService } from './curriculum.js';

export class SkillService implements ISkillService {
  constructor(private readonly repo: ICosmosRepository) {}
  async getProgression(ageGroupId: Parameters<ISkillService['getProgression']>[0]) {
    const curriculum = await new CurriculumService(this.repo).get(ageGroupId);
    if (curriculum) return {
      skills: curriculum.skills.map(({ id, name, description }) => ({ id, name, description })),
      progressions: curriculum.skills.map(skill => ({ id: `${ageGroupId}-${skill.id}`, skill_id: skill.id, age_group_id: ageGroupId, version: curriculum.version, level: skill.level, description: skill.progression })),
    };
    const progressions = await find<SkillProgression>(this.repo, REFERENCE, 'progression', { age_group_id: ageGroupId });
    const skills = await find<Skill>(this.repo, REFERENCE, 'skill');
    const ids = new Set(progressions.map(p => p.skill_id));
    return { skills: skills.filter(s => ids.has(s.id)), progressions };
  }
  async getTeamProgress(teamId: string): Promise<TeamSkillProgress[]> {
    if (!await this.repo.getById(TEAM, teamId, teamId)) throw new NotFoundError('Team', teamId);
    return find(this.repo, TEAM, 'skill-progress', { team_id: teamId }, teamId);
  }
  async updateTeamProgress(teamId: string, skillId: string, input: Parameters<ISkillService['updateTeamProgress']>[2]): Promise<TeamSkillProgress | null> {
    if (!await this.repo.getById(TEAM, teamId, teamId)) return null;
    const team = await this.repo.getById<{ age_group_id: Parameters<ISkillService['getProgression']>[0] }>(TEAM, teamId, teamId);
    if (!team || !(await this.getProgression(team.age_group_id)).skills.some(skill => skill.id === skillId)) return null;
    const progress: TeamSkillProgress = { id: `skill-${skillId}`, team_id: teamId, skill_id: skillId, ...input, updated_at: new Date().toISOString() };
    return clean(await this.repo.upsert(TEAM, record('skill-progress', teamId, progress)));
  }
  healthCheck(): Promise<boolean> { return this.repo.healthCheck(); }
}
