import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { buildCatalog, importCatalog } from '../scripts/import-catalog.mjs';
import { ProgramService } from '../src/services/programs.js';
import { CatalogService } from '../src/services/catalog.js';
import { SkillService } from '../src/services/skills.js';
import { MemoryRepository } from './memory.js';

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
  it.skipIf(!existsSync(new URL('../../data/nl/warmup.json', import.meta.url)))('fills all 12 HB3 demo sessions using the supplied catalog and requested equipment', async () => {
    const catalog = await buildCatalog();
    const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
    const repo = new MemoryRepository({
      'team-records': [{ kind: 'team', id: teamId, team_id: teamId, name: 'HB3', age_group_id: 'Senioren' }],
      'reference-data': [catalog, ...['contact', 'accuracy', 'groundballs', 'starts', 'game_awareness', 'mental'].map(skill_id => ({
        kind: 'progression', id: skill_id, skill_id, age_group_id: 'Senioren', version: 1, level: 1, description: 'Beginnersbasis',
      }))],
    });
    const settings = { startDate: '2026-11-13', day: 'woensdag', time: '20:30', duration: 90, phase: 'Winter', location: 'zaal — laag plafond', equipment: ['bat', 'balls', 'gloves', 'net', 'tee', 'cones', 'banden', 'L-scherm'], field: false, cage: true, mound: true };
    const svc = new ProgramService(repo, new CatalogService(repo), new SkillService(repo));
    const { program, sessions } = await svc.createProgram(teamId, settings);
    expect(sessions).toHaveLength(12);
    expect(sessions[0].date).toBe('2026-11-18');
    expect(sessions.at(-1).date).toBe('2027-02-03');
    const lastUsed = new Map();
    for (const [index, session] of sessions.entries()) {
      expect(session).toMatchObject({ time: '20:30', end: '22:00' });
      expect(session.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(90);
      expect(session.blocks.some(block => block.drill_id)).toBe(true);
      let minutes = 20 * 60 + 30;
      for (const block of session.blocks) {
        expect(block.time).toBe(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
        minutes += block.minutes;
        if (!block.drill_id) continue;
        const drill = catalog.drills.find(item => item.id === block.drill_id);
        expect(drill.indoor_friendly).toBe(true);
        expect(drill.equipment_required.every(item => settings.equipment.includes(item))).toBe(true);
        expect(block.minutes).toBeGreaterThanOrEqual(drill.duration_minutes.minimum);
        expect(block.minutes).toBeLessThanOrEqual(drill.duration_minutes.maximum);
        expect(index * 7 - (lastUsed.get(drill.id) ?? -Infinity)).toBeGreaterThanOrEqual(drill.selection.minimum_repeat_gap_days);
        lastUsed.set(drill.id, index * 7);
      }
    }
    expect(await svc.listSessions(program.id)).toEqual(sessions);
  });
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
