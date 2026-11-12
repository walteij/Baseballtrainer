import { describe, expect, it, vi } from 'vitest';
const constructors = vi.hoisted(() => ({ cosmos: vi.fn(), credential: vi.fn() }));
vi.mock('@azure/cosmos', () => ({ CosmosClient: class { constructor(value: unknown) { constructors.cosmos(value); } } }));
vi.mock('@azure/identity', () => ({ DefaultAzureCredential: class { constructor() { constructors.credential(); } } }));
import { CosmosClientProvider } from '../src/services/cosmos.js';

describe('Cosmos provider selection', () => {
  const config = { cosmosDatabase: 'honkbal', cosmosEndpoint: 'https://example.documents.azure.com', cosmosConnectionString: 'emulator-only' };
  it('uses the connection string only for exact Development', () => {
    constructors.cosmos.mockClear(); constructors.credential.mockClear();
    new CosmosClientProvider({ ...config, environment: 'Development' });
    expect(constructors.cosmos).toHaveBeenLastCalledWith('emulator-only');
    expect(constructors.credential).not.toHaveBeenCalled();
  });
  it.each(['Production', '', 'development', 'Staging'])('uses identity for %s and ignores the connection string', environment => {
    constructors.cosmos.mockClear(); constructors.credential.mockClear();
    new CosmosClientProvider({ ...config, environment });
    expect(constructors.cosmos).toHaveBeenCalledWith(expect.objectContaining({ endpoint: config.cosmosEndpoint, aadCredentials: expect.anything() }));
    expect(constructors.credential).toHaveBeenCalledOnce();
  });
  it('requires an endpoint in non-development environments even when a string is present', () => {
    expect(() => new CosmosClientProvider({ ...config, environment: '', cosmosEndpoint: undefined })).toThrow('COSMOSDB_ENDPOINT');
  });
});
