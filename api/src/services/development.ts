import { DevelopmentModelSchema, type DevelopmentModel } from '../../../shared/schemas/development.js';
import { ConflictError, ValidationError } from '../errors/errorTypes.js';
import { REFERENCE } from './data.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';

export interface DevelopmentVersion {
  version: number;
  model: DevelopmentModel;
  savedAt: string;
  savedBy: string;
}

export class DevelopmentService {
  constructor(private readonly repo: ICosmosRepository) {}

  async get(version?: number): Promise<DevelopmentVersion | null> {
    const records = version === undefined ? await this.repo.query<{ version: number }>(REFERENCE, {
      query: 'SELECT c.version FROM c WHERE c.kind = @p0',
      parameters: [{ name: '@p0', value: 'development-model' }],
      partitionKey: 'development-model',
    }) : [];
    const selected = version ?? Math.max(0, ...records.map(record => record.version));
    if (!selected) return null;
    const record = await this.repo.getById<DevelopmentVersion & { kind: string }>(REFERENCE, `development-model-${selected}`, 'development-model');
    if (!record && version === undefined) throw new Error('Latest development model version is missing');
    if (!record) return null;
    if (record.kind !== 'development-model' || record.version !== selected) throw new Error('Invalid development model version record');
    return { version: record.version, model: record.model, savedAt: record.savedAt, savedBy: record.savedBy };
  }

  async save(expectedVersion: number, input: unknown, userId: string): Promise<DevelopmentVersion> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
      throw new ValidationError('Expected version must be a non-negative integer');
    }
    const parsed = DevelopmentModelSchema.safeParse(input);
    if (!parsed.success) {
      const details = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new ValidationError(`Development model is invalid: ${details}`);
    }
    if ((await this.get())?.version !== (expectedVersion || undefined)) {
      throw new ConflictError('Development model changed; reload and retry');
    }
    const result: DevelopmentVersion = {
      version: expectedVersion + 1,
      model: parsed.data,
      savedAt: new Date().toISOString(),
      savedBy: userId,
    };
    const document = { ...result, id: `development-model-${result.version}`, kind: 'development-model', pk: 'development-model' };
    if (Buffer.byteLength(JSON.stringify(document), 'utf8') > 1_900_000) {
      throw new ValidationError('Development model is too large to store');
    }
    try {
      await this.repo.create(REFERENCE, document);
    } catch (error) {
      if ((error as { code?: number }).code === 409) throw new ConflictError('Development model changed; reload and retry');
      throw error;
    }
    return result;
  }
}
