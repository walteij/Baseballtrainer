import type { Catalog } from '../../../shared/types/entities.js';
import type { ICatalogService } from './interfaces/ICatalogService.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { REFERENCE, find } from './data.js';
import { ServiceUnavailableError } from '../errors/errorTypes.js';

export class CatalogService implements ICatalogService {
  constructor(private readonly repo: ICosmosRepository) {}
  async getCatalog(): Promise<Catalog> {
    const [catalog] = await find<Catalog>(this.repo, REFERENCE, 'catalog');
    if (!catalog) throw new ServiceUnavailableError('Catalog has not been imported');
    return { drills: catalog.drills, categories: catalog.categories, warmup: catalog.warmup };
  }
  healthCheck(): Promise<boolean> { return this.repo.healthCheck(); }
}
