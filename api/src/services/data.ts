import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import type { OperationInput } from '@azure/cosmos';

export const TEAM = 'team-records';
export const REFERENCE = 'reference-data';
export interface BatchRepository extends ICosmosRepository {
  batch(container: string, partitionKey: string, operations: OperationInput[]): Promise<void>;
}
export type RecordDocument<T> = T & { kind: string; team_id: string };
export function record<T extends object>(kind: string, teamId: string, value: T): RecordDocument<T> {
  return { ...value, kind, team_id: teamId };
}
export function batchRecord<T extends object>(kind: string, teamId: string, value: T): Record<string, any> {
  return JSON.parse(JSON.stringify(record(kind, teamId, value))) as Record<string, any>;
}
export function clean<T>(value: T): T {
  const { kind: _kind, pk: _pk, _rid, _self, _etag, _attachments, _ts, ...rest } = value as T & Record<string, unknown>;
  return rest as T;
}
export async function find<T>(repo: ICosmosRepository, container: string, kind: string, filters: Record<string, string | number> = {}, partitionKey?: string): Promise<T[]> {
  const entries = Object.entries({ kind, ...filters });
  const rows = await repo.query<T>(container, {
    query: `SELECT * FROM c WHERE ${entries.map(([key], i) => `c.${key} = @p${i}`).join(' AND ')}`,
    parameters: entries.map(([, value], i) => ({ name: `@p${i}`, value })),
    partitionKey,
  });
  return rows.map(clean);
}
