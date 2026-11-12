import { z } from 'zod';
import { AgeGroupGoalsParamsSchema, SkillIdSchema, UuidSchema } from '../../../shared/schemas/validation.js';
import { requireCommittee } from '../auth.js';
import { body, emptyQuery, query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';

const curriculumSchema = z.object({
  expectedVersion: z.number().int().min(0),
  goals: z.array(z.object({ id: UuidSchema.optional(), text: z.string().trim().min(1).max(300), skill_ids: z.array(SkillIdSchema).max(50) }).strict()).min(1).max(50),
  skills: z.array(z.object({ id: SkillIdSchema, name: z.string().trim().min(1).max(100), description: z.string().trim().min(1).max(500), level: z.number().int().min(1).max(10), progression: z.string().trim().min(1).max(500) }).strict()).min(1).max(50),
}).strict();

register('getCurriculum', 'GET', 'age-groups/{ageGroupId}/curriculum', async req => {
  query(req, emptyQuery);
  const { ageGroupId } = AgeGroupGoalsParamsSchema.parse(req.params);
  return respond(200, { curriculum: await getServices().curriculum.get(ageGroupId) });
});
register('saveCurriculum', 'PUT', 'age-groups/{ageGroupId}/curriculum', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery);
  const { ageGroupId } = AgeGroupGoalsParamsSchema.parse(req.params);
  const { expectedVersion, ...input } = await body(req, curriculumSchema);
  return respond(200, { curriculum: await getServices().curriculum.save(ageGroupId, expectedVersion, input) });
});
