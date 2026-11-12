import { randomUUID } from 'node:crypto';
import type { AgeGroupId } from '../../../shared/types/entities.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { REFERENCE, find } from './data.js';
import { ConflictError, ValidationError } from '../errors/errorTypes.js';

export interface CurriculumInput {
  goals: { id?: string; text: string; skill_ids: string[] }[];
  skills: { id: string; name: string; description: string; level: number; progression: string }[];
}
export interface Curriculum {
  age_group_id: AgeGroupId;
  version: number;
  goals: { id: string; text: string; skill_ids: string[] }[];
  skills: CurriculumInput['skills'];
}

export class CurriculumService {
  constructor(private readonly repo: ICosmosRepository) {}
  async get(ageGroupId: AgeGroupId, version?: number): Promise<Curriculum | null> {
    const records = await find<Curriculum>(this.repo, REFERENCE, 'curriculum', { age_group_id: ageGroupId });
    const selected = version ?? Math.max(0, ...records.map(item => item.version));
    return records.find(item => item.version === selected) ?? null;
  }
  async save(ageGroupId: AgeGroupId, expectedVersion: number, input: CurriculumInput): Promise<Curriculum> {
    const current = await this.get(ageGroupId);
    if ((current?.version ?? 0) !== expectedVersion) throw new ConflictError('Curriculum changed; reload and retry');
    const ids = input.skills.map(skill => skill.id);
    if (new Set(ids).size !== ids.length) throw new ValidationError('Duplicate skill ID');
    if (input.goals.some(goal => goal.skill_ids.some(id => !ids.includes(id)))) throw new ValidationError('Goal references unknown skill');
    const goalIds = input.goals.map(goal => goal.id).filter((id): id is string => !!id);
    if (new Set(goalIds).size !== goalIds.length) throw new ValidationError('Duplicate goal ID');
    const result: Curriculum = {
      age_group_id: ageGroupId, version: expectedVersion + 1,
      goals: input.goals.map(goal => ({ ...goal, id: goal.id ?? randomUUID() })), skills: input.skills,
    };
    try {
      await this.repo.create(REFERENCE, { ...result, id: `curriculum-${result.version}`, kind: 'curriculum', pk: `curriculum:${ageGroupId}` });
    } catch (error) {
      if ((error as { code?: number }).code === 409) throw new ConflictError('Curriculum changed; reload and retry');
      throw error;
    }
    return result;
  }
}
