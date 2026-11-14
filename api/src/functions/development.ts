import { z } from 'zod';
import { DevelopmentModelSchema } from '../../../shared/schemas/development.js';
import { SaveDevelopmentAssignmentsSchema } from '../../../shared/schemas/developmentAssignment.js';
import { TeamSeasonGoalsParamsSchema } from '../../../shared/schemas/validation.js';
import { requireCommittee } from '../auth.js';
import { body, emptyQuery, query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';

const modelQuery = z.object({ version: z.coerce.number().int().positive().optional() }).strict();
const saveModel = z.object({
  expectedVersion: z.number().int().min(0),
  model: DevelopmentModelSchema,
}).strict();

register('getDevelopmentModel', 'GET', 'development-model', async req => {
  const { version } = query(req, modelQuery);
  return respond(200, { development: await getServices().development.get(version) });
});
register('saveDevelopmentModel', 'PUT', 'development-model', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery);
  const input = await body(req, saveModel);
  return respond(200, { development: await getServices().development.save(input.expectedVersion, input.model, user.objectId) });
});
register('getDevelopmentAssignments', 'GET', 'teams/{teamId}/seasons/{seasonId}/development-goals', async req => {
  query(req, emptyQuery);
  const { teamId, seasonId } = TeamSeasonGoalsParamsSchema.parse(req.params);
  return respond(200, { developmentAssignments: await getServices().developmentAssignments.get(teamId, seasonId) });
});
register('saveDevelopmentAssignments', 'PUT', 'teams/{teamId}/seasons/{seasonId}/development-goals', async (req, user) => {
  query(req, emptyQuery);
  const { teamId, seasonId } = TeamSeasonGoalsParamsSchema.parse(req.params);
  await getServices().teamAccess.requireGoalWrite(user, teamId);
  const input = await body(req, SaveDevelopmentAssignmentsSchema);
  return respond(200, { developmentAssignments: await getServices().developmentAssignments.save(teamId, seasonId, input, user.objectId) });
});
