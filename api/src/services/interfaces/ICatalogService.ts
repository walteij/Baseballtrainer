import type { Catalog } from '../../../../shared/types/entities.js';

export interface ICatalogService {
  getCatalog(): Promise<Catalog>;
  healthCheck(): Promise<boolean>;
}
