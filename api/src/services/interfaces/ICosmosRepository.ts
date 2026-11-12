import type { SqlParameter } from '@azure/cosmos';

export interface CosmosQuery {
  query: string;
  parameters?: SqlParameter[];
  partitionKey?: string;
}

export interface ICosmosRepository {
  getById<T>(container: string, id: string, partitionKey: string): Promise<T | null>;
  query<T>(container: string, query: CosmosQuery): Promise<T[]>;
  create<T extends { id: string }>(container: string, document: T): Promise<T>;
  upsert<T extends { id: string }>(container: string, document: T): Promise<T>;
  delete(container: string, id: string, partitionKey: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}
