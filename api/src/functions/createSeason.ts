import { CreateTeamSeasonParamsSchema, CreateTeamSeasonSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('createSeason', 'POST', 'teams/{teamId}/seasons', async (req, user) => {
  query(req, emptyQuery); const { teamId } = CreateTeamSeasonParamsSchema.parse(req.params);
  await getServices().teamAccess.requireGoalWrite(user, teamId);
  return respond(201, { teamSeason: await getServices().teams.createSeason(teamId, await body(req, CreateTeamSeasonSchema)) });
});
