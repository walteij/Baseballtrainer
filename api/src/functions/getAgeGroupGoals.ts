import { AgeGroupGoalsParamsSchema, AgeGroupGoalsQuerySchema } from '../../../shared/schemas/validation.js';
import { query, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('getAgeGroupGoals', 'GET', 'age-groups/{ageGroupId}/goals', async req => {
  const { ageGroupId } = AgeGroupGoalsParamsSchema.parse(req.params);
  const { version } = query(req, AgeGroupGoalsQuerySchema.strict());
  return respond(200, { ageGroupId, ...required(await getServices().goals.getAgeGroupGoals(ageGroupId, version), 'Age group goals', ageGroupId) });
});
