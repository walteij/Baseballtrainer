import { SkillProgressionQuerySchema } from '../../../shared/schemas/validation.js';
import { query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('skillProgression', 'GET', 'skills/progression', async req => {
  const { age_group_id } = query(req, SkillProgressionQuerySchema.strict());
  return respond(200, await getServices().skills.getProgression(age_group_id));
});
