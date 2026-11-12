import { register, respond, query, emptyQuery } from '../http.js';
import { createHostStorageCheck, getServices } from '../services/registry.js';
import { loadConfig } from '../services/config.js';
register('health', 'GET', 'health', async req => {
  query(req, emptyQuery);
  let cosmos = false, hostStorage = false;
  try {
    const services = getServices();
    [cosmos, hostStorage] = await Promise.all([
      services.cosmos.healthCheck().catch(() => false),
      services.hostStorage.healthCheck().catch(() => false),
    ]);
  } catch { hostStorage = await createHostStorageCheck(loadConfig()).healthCheck(); }
  const status = cosmos && hostStorage ? 'healthy' : cosmos || hostStorage ? 'degraded' : 'unhealthy';
  return respond(status === 'unhealthy' ? 503 : 200, { status, services: { cosmos: cosmos ? 'healthy' : 'unhealthy', hostStorage: hostStorage ? 'healthy' : 'unhealthy' } });
});
