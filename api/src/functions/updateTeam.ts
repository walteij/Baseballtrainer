import { TeamIdParamsSchema, UpdateTeamSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
import { requireCommittee } from '../auth.js';
register('updateTeam', 'PATCH', 'teams/{id}', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery); const { id } = TeamIdParamsSchema.parse(req.params);
  return respond(200, { team: required(await getServices().teams.updateTeam(id, await body(req, UpdateTeamSchema)), 'Team', id) });
});
