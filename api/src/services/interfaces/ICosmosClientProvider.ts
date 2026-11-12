import type { CosmosClient } from '@azure/cosmos';

export interface ICosmosClientProvider {
  getClient(): CosmosClient;
  healthCheck(): Promise<boolean>;
}
