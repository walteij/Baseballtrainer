import { CreateTeamSchema } from '../../../shared/schemas/validation.js';
import { body, query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
import { requireCommittee } from '../auth.js';
register('createTeam', 'POST', 'teams', async (req, user) => { requireCommittee(user); query(req, emptyQuery); return respond(201, { team: await getServices().teams.createTeam(await body(req, CreateTeamSchema)) }); });
