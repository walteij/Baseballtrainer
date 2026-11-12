import { TeamSkillProgressUpdateParamsSchema, UpdateTeamSkillProgressSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('updateTeamSkillProgress', 'PUT', 'teams/{id}/skill-progress/{skillId}', async (req, user) => {
  query(req, emptyQuery); const { id, skillId } = TeamSkillProgressUpdateParamsSchema.parse(req.params);
  await getServices().teamAccess.requireGoalWrite(user, id);
  return respond(200, { skillProgress: required(await getServices().skills.updateTeamProgress(id, skillId, await body(req, UpdateTeamSkillProgressSchema)), 'Team or skill', `${id}/${skillId}`) });
});
