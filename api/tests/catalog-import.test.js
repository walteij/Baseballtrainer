import { describe, expect, it, vi } from 'vitest';
import { buildCatalog, importCatalog } from '../scripts/import-catalog.mjs';

const sampleDrill = id => ({
  id, name_nl: 'Oefening', category: 'throwing', subcategories: [], skills: [],
  duration_minutes: { default: 10, minimum: 5, maximum: 15 },
  players_min: 1, players_max: 2, equipment_required: [], equipment_optional: [],
  indoor_friendly: true, space_required: 'zaal', difficulty: 'basis', description: 'Oefening',
  setup: [], execution: [], coaching_points: [], common_mistakes: [], safety_notes: [],
  variations: [], youtube: null, selection: { minimum_repeat_gap_days: 0, preferred_session_blocks: [] },
});
const source = async path => {
  const name = path.split(/[\\/]/).at(-1);
  if (name === 'categories.json') return JSON.stringify({ throwing: [] });
  if (name === 'warmup.json') return JSON.stringify({ duration_minutes: 0, blocks: [] });
  return JSON.stringify([sampleDrill(name)]);
};

describe('catalog import', () => {
  it('validates catalog data and safely upserts the same document', async () => {
    const document = await buildCatalog('unused', source);
    expect(document.drills.length).toBeGreaterThan(0);
    expect(new Set(document.drills.map(item => item.id)).size).toBe(document.drills.length);
    const upsert = vi.fn().mockResolvedValue({});
    const query = vi.fn().mockReturnValue({ fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 'catalog', pk: 'catalog' }] }) });
    const container = { items: { query, upsert } };
    await importCatalog(container, document);
    await importCatalog(container, document);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenLastCalledWith(document);
  });
  it('refuses to create a competing catalog', async () => {
    const upsert = vi.fn();
    const container = { items: { query: vi.fn().mockReturnValue({ fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 'other', pk: 'catalog' }] }) }), upsert } };
    await expect(importCatalog(container, await buildCatalog('unused', source))).rejects.toThrow('different catalog');
    expect(upsert).not.toHaveBeenCalled();
  });
});
