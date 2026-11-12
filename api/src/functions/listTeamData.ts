import { CreateTeamSeasonParamsSchema } from '../../../shared/schemas/validation.js';
import { emptyQuery, query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';

register('listTeamSeasons', 'GET', 'teams/{teamId}/seasons', async req => {
  query(req, emptyQuery);
  const { teamId } = CreateTeamSeasonParamsSchema.parse(req.params);
  return respond(200, { seasons: await getServices().teams.listSeasons(teamId) });
});

register('listTeamSessions', 'GET', 'teams/{teamId}/sessions', async req => {
  query(req, emptyQuery);
  const { teamId } = CreateTeamSeasonParamsSchema.parse(req.params);
  return respond(200, { sessions: await getServices().programs.listTeamSessions(teamId) });
});
