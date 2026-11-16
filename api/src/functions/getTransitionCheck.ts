import { TeamSeasonGoalsParamsSchema } from '../../../shared/schemas/validation.js';
import { emptyQuery, query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';

register('getTransitionCheck', 'GET', 'teams/{teamId}/seasons/{seasonId}/transition-check', async req => {
  query(req, emptyQuery);
  const { teamId, seasonId } = TeamSeasonGoalsParamsSchema.parse(req.params);
  return respond(200, { transitionCheck: await getServices().developmentSteering.transitionCheck(teamId, seasonId) });
});
