import type { OperationInput } from '@azure/cosmos';
import type { CosmosQuery } from '../src/services/interfaces/ICosmosRepository.js';
import type { BatchRepository } from '../src/services/data.js';

type Doc = { id: string; team_id?: string; [key: string]: any };
export class MemoryRepository implements BatchRepository {
  data = new Map<string, Doc[]>();
  constructor(initial: Record<string, Doc[]> = {}) { for (const [k, v] of Object.entries(initial)) this.data.set(k, structuredClone(v)); }
  private list(container: string): Doc[] {
    if (!this.data.has(container)) this.data.set(container, []);
    return this.data.get(container)!;
  }
  async getById<T>(container: string, id: string, partitionKey: string): Promise<T | null> {
    return structuredClone(this.list(container).find(d => d.id === id && (d.team_id ?? d.pk) === partitionKey) as T ?? null);
  }
  async query<T>(container: string, q: CosmosQuery): Promise<T[]> {
    const fields = [...q.query.matchAll(/c\.(\w+) = @p(\d+)/g)];
    return structuredClone(this.list(container).filter(d => (!q.partitionKey || (d.team_id ?? d.pk) === q.partitionKey) && fields.every(([, field, index]) => d[field] === q.parameters?.[Number(index)]?.value)) as T[]);
  }
  async create<T extends { id: string }>(container: string, doc: T): Promise<T> {
    const d = doc as Doc;
    if (this.list(container).some(x => x.id === d.id && (x.team_id ?? x.pk) === (d.team_id ?? d.pk))) throw Object.assign(new Error('Conflict'), { code: 409 });
    this.list(container).push(structuredClone(d)); return structuredClone(doc);
  }
  async upsert<T extends { id: string }>(container: string, doc: T): Promise<T> {
    const d = doc as Doc;
    await this.delete(container, d.id, d.team_id ?? d.pk ?? '');
    this.list(container).push(structuredClone(d)); return structuredClone(doc);
  }
  async delete(container: string, id: string, partitionKey: string): Promise<boolean> {
    const list = this.list(container); const index = list.findIndex(d => d.id === id && (d.team_id ?? d.pk) === partitionKey);
    if (index < 0) return false; list.splice(index, 1); return true;
  }
  async batch(container: string, partitionKey: string, operations: OperationInput[]): Promise<void> {
    const snapshot = structuredClone(this.list(container));
    try {
      for (const op of operations) {
        if (op.operationType === 'Create') await this.create(container, op.resourceBody as Doc);
        else if (op.operationType === 'Upsert') await this.upsert(container, op.resourceBody as Doc);
        else if (op.operationType === 'Replace') { if (!await this.delete(container, op.id, partitionKey)) throw Object.assign(new Error('Not found'), { code: 404 }); await this.create(container, op.resourceBody as Doc); }
        else if (op.operationType === 'Delete') { if (!await this.delete(container, op.id, partitionKey)) throw Object.assign(new Error('Not found'), { code: 404 }); }
        else throw new Error('Unsupported mock operation');
      }
    } catch (error) { this.data.set(container, snapshot); throw error; }
  }
  async healthCheck(): Promise<boolean> { return true; }
}
