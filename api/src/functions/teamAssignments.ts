import { z } from 'zod';
import { UuidSchema } from '../../../shared/schemas/validation.js';
import { requireCommittee } from '../auth.js';
import { emptyQuery, query, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';

const teamParams = z.object({ teamId: UuidSchema });
const assignmentParams = teamParams.extend({ objectId: UuidSchema });

register('listTeamAssignments', 'GET', 'teams/{teamId}/trainers', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery);
  const { teamId } = teamParams.parse(req.params);
  return respond(200, { assignments: await getServices().teamAccess.list(teamId) });
});

register('assignTeamTrainer', 'PUT', 'teams/{teamId}/trainers/{objectId}', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery);
  const { teamId, objectId } = assignmentParams.parse(req.params);
  await getServices().teamAccess.assign(teamId, objectId);
  return { status: 204 };
});

register('unassignTeamTrainer', 'DELETE', 'teams/{teamId}/trainers/{objectId}', async (req, user) => {
  requireCommittee(user);
  query(req, emptyQuery);
  const { teamId, objectId } = assignmentParams.parse(req.params);
  await getServices().teamAccess.unassign(teamId, objectId);
  return { status: 204 };
});
