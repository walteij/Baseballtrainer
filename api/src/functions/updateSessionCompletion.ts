import { SessionIdParamsSchema, UpdateSessionCompletionSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, required, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('updateSessionCompletion', 'PUT', 'sessions/{id}/completion', async (req, user) => {
  query(req, emptyQuery); const { id } = SessionIdParamsSchema.parse(req.params);
  const input = await body(req, UpdateSessionCompletionSchema);
  const service = getServices().programs;
  const session = required(await service.getSession(id), 'Session', id);
  await getServices().teamAccess.requireGoalWrite(user, session.team_id);
  return respond(200, { session: await service.saveSession(id, { ...session, completed: input.completed, completed_items: input.completedItems }) });
});
