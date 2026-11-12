import { emptyQuery, query, register, respond } from '../http.js';
register('identity', 'GET', 'me', async (req, user) => {
  query(req, emptyQuery);
  return respond(200, { objectId: user.objectId, isCommittee: user.isCommittee });
});
