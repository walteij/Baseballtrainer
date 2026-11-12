import { ProgramSessionsParamsSchema } from '../../../shared/schemas/validation.js';
import { query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('getProgramSessions', 'GET', 'programs/{id}/sessions', async req => {
  query(req, emptyQuery); const { id } = ProgramSessionsParamsSchema.parse(req.params);
  return respond(200, { sessions: required(await getServices().programs.listSessions(id), 'Program', id) });
});
