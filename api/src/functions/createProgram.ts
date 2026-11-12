import { CreateProgramSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('createProgram', 'POST', 'programs', async (req, user) => {
  query(req, emptyQuery);
  const input = await body(req, CreateProgramSchema);
  await getServices().teamAccess.requireGoalWrite(user, input.team_id);
  return respond(201, await getServices().programs.createProgram(input.team_id, input.settings));
});
