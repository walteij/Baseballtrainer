import { ProgramIdParamsSchema } from '../../../shared/schemas/validation.js';
import { query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('getProgram', 'GET', 'programs/{id}', async req => {
  query(req, emptyQuery); const { id } = ProgramIdParamsSchema.parse(req.params);
  return respond(200, { program: required(await getServices().programs.getProgram(id), 'Program', id) });
});
