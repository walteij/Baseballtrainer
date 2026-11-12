import { CosmosClient, type OperationInput } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import type { AppConfig } from './config.js';
import { validateProviderConfig } from './config.js';
import type { ICosmosClientProvider } from './interfaces/ICosmosClientProvider.js';
import type { CosmosQuery, ICosmosRepository } from './interfaces/ICosmosRepository.js';

export class CosmosClientProvider implements ICosmosClientProvider {
  private readonly client: CosmosClient;
  constructor(config: AppConfig) {
    validateProviderConfig(config);
    this.client = config.environment === 'Development'
      ? new CosmosClient(config.cosmosConnectionString!)
      : new CosmosClient({ endpoint: config.cosmosEndpoint!, aadCredentials: new DefaultAzureCredential() });
  }
  getClient(): CosmosClient { return this.client; }
  async healthCheck(): Promise<boolean> {
    try { await this.client.getDatabaseAccount(); return true; } catch { return false; }
  }
}

export class CosmosRepository implements ICosmosRepository {
  constructor(private readonly provider: ICosmosClientProvider, private readonly database: string) {}
  private container(name: string) { return this.provider.getClient().database(this.database).container(name); }
  async getById<T>(container: string, id: string, partitionKey: string): Promise<T | null> {
    try { return ((await this.container(container).item(id, partitionKey).read()).resource as T | undefined) ?? null; }
    catch (error) { if ((error as { code?: number }).code === 404) return null; throw error; }
  }
  async query<T>(container: string, query: CosmosQuery): Promise<T[]> {
    return (await this.container(container).items.query<T>(
      { query: query.query, parameters: query.parameters },
      query.partitionKey === undefined ? undefined : { partitionKey: query.partitionKey },
    ).fetchAll()).resources;
  }
  async create<T extends { id: string }>(container: string, document: T): Promise<T> {
    return (await this.container(container).items.create(document)).resource as T;
  }
  async upsert<T extends { id: string }>(container: string, document: T): Promise<T> {
    return (await this.container(container).items.upsert(document)).resource as unknown as T;
  }
  async delete(container: string, id: string, partitionKey: string): Promise<boolean> {
    try { await this.container(container).item(id, partitionKey).delete(); return true; }
    catch (error) { if ((error as { code?: number }).code === 404) return false; throw error; }
  }
  async batch(container: string, partitionKey: string, operations: OperationInput[]): Promise<void> {
    const result = await this.container(container).items.batch(operations, partitionKey);
    const code = result.result?.find(item => item.statusCode >= 400 && item.statusCode !== 424)?.statusCode ?? result.code ?? 200;
    if (code >= 400) {
      const error = new Error(`Cosmos batch failed (${code})`) as Error & { code: number };
      error.code = code;
      throw error;
    }
  }
  async healthCheck(): Promise<boolean> {
    try { await this.provider.getClient().database(this.database).read(); return true; } catch { return false; }
  }
}
