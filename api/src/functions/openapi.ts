import { register, respond, query, emptyQuery } from '../http.js';
import { openapi } from '../openapi.js';
register('openapi', 'GET', 'openapi.json', async req => { query(req, emptyQuery); return respond(200, openapi); });
