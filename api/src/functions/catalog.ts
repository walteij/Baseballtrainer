import { register, respond, query, emptyQuery } from '../http.js';
import { getServices } from '../services/registry.js';
register('catalog', 'GET', 'catalog', async req => {
  query(req, emptyQuery);
  return respond(200, await getServices().catalog.getCatalog());
});
