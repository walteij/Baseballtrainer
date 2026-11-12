import { TeamSeasonGoalsParamsSchema } from '../../../shared/schemas/validation.js';
import { query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('getSeasonGoals', 'GET', 'teams/{teamId}/seasons/{seasonId}/goals', async req => {
  query(req, emptyQuery); const { teamId, seasonId } = TeamSeasonGoalsParamsSchema.parse(req.params);
  return respond(200, required(await getServices().goals.getTeamSeasonGoals(teamId, seasonId), 'Goal composition', seasonId));
});
