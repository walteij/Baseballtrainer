import { query, emptyQuery, register, respond } from '../http.js';
import { getServices } from '../services/registry.js';
register('listTeams', 'GET', 'teams', async req => { query(req, emptyQuery); return respond(200, { teams: await getServices().teams.listTeams() }); });
