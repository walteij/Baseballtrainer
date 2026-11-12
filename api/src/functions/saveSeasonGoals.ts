import { TeamSeasonGoalsParamsSchema, SaveTeamSeasonGoalsSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('saveSeasonGoals', 'PUT', 'teams/{teamId}/seasons/{seasonId}/goals', async (req, user) => {
  query(req, emptyQuery); const { teamId, seasonId } = TeamSeasonGoalsParamsSchema.parse(req.params);
  await getServices().teamAccess.requireGoalWrite(user, teamId);
  return respond(200, await getServices().goals.saveTeamSeasonGoals(teamId, seasonId, await body(req, SaveTeamSeasonGoalsSchema)));
});
