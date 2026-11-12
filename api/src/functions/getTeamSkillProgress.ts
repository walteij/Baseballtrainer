import { TeamSkillProgressParamsSchema } from '../../../shared/schemas/validation.js';
import { query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('getTeamSkillProgress', 'GET', 'teams/{id}/skill-progress', async req => {
  query(req, emptyQuery); const { id } = TeamSkillProgressParamsSchema.parse(req.params);
  return respond(200, { skillProgress: await getServices().skills.getTeamProgress(id) });
});
