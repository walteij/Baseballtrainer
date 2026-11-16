// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { developmentFixture } from '../../api/tests/developmentFixture';

const mocks = vi.hoisted(() => ({
  getDevelopment: vi.fn(),
  saveDevelopment: vi.fn(),
  getDevelopmentAssignments: vi.fn(),
  saveDevelopmentAssignments: vi.fn(),
  getTransitionCheck: vi.fn(),
}));
vi.mock('$lib/api', () => ({ api: mocks }));
import DevelopmentEditor from '../src/lib/components/DevelopmentEditor.svelte';
import DevelopmentTeamGoals from '../src/lib/components/DevelopmentTeamGoals.svelte';

const teamId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
const seasonId = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23422';
const version = () => ({ version: 1, model: developmentFixture(), savedAt: '2026-01-01T00:00:00Z', savedBy: 'tc' });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getDevelopment.mockResolvedValue(version());
  mocks.getDevelopmentAssignments.mockResolvedValue(null);
  mocks.getTransitionCheck.mockResolvedValue({ transition: null, modelVersion: null, skills: [] });
});
afterEach(cleanup);

describe('development goals UI', () => {
  it('lets the TC edit and save a draft goal without approving it automatically', async () => {
    mocks.saveDevelopment.mockImplementation(async (expectedVersion, model) => ({ version: expectedVersion + 1, model, savedAt: '', savedBy: 'tc' }));
    render(DevelopmentEditor);
    await screen.findByText('Opgeslagen versie 1');
    const goal = screen.getByText('6-8 jaar · Doel 6-8 jaar · draft').closest('details')!;
    await fireEvent.input(within(goal).getByLabelText('Naam'), { target: { value: 'Aangepast' } });
    await fireEvent.click(screen.getByText('Bewaar nieuwe versie'));
    await screen.findByText(/Leerlijn opgeslagen als versie 2/);
    expect(mocks.saveDevelopment.mock.calls[0][0]).toBe(1);
    expect(mocks.saveDevelopment.mock.calls[0][1].skillGoals[0]).toMatchObject({ name: { nl: 'Aangepast' }, status: 'draft' });
  });

  it('sorts age-prefixed goals and filters both lists without losing hidden edits on save', async () => {
    const current = version();
    current.model.ageGroups.reverse();
    current.model.skillGoals.reverse();
    mocks.getDevelopment.mockResolvedValue(current);
    mocks.saveDevelopment.mockImplementation(async (expectedVersion, model) => ({ ...current, version: expectedVersion + 1, model }));
    const { container } = render(DevelopmentEditor);
    await screen.findByText('Opgeslagen versie 1');
    expect([...container.querySelectorAll('summary')].map(item => item.textContent)).toEqual([
      '6-8 jaar · Doel 6-8 jaar · draft',
      '9-10 jaar · Doel 9-10 jaar · draft',
      '11-12 jaar · Doel 11-12 jaar · draft',
      '13-15 jaar · Doel 13-15 jaar · draft',
      '16+ jaar · Doel 16+ jaar · draft',
      '6-8 jaar · Clubdoel · draft',
    ]);
    const first = screen.getByText('6-8 jaar · Doel 6-8 jaar · draft').closest('details')!;
    await fireEvent.input(within(first).getByLabelText('Naam'), { target: { value: 'Aangepast' } });
    await fireEvent.change(screen.getByLabelText('Filter op leeftijdsband'), { target: { value: 'age_16_plus' } });
    expect(screen.queryByText('6-8 jaar · Aangepast · draft')).toBeNull();
    expect(screen.getByText('16+ jaar · Doel 16+ jaar · draft')).toBeTruthy();
    expect(screen.getByText('Geen clubdoelen voor deze leeftijdsband.')).toBeTruthy();
    await fireEvent.click(screen.getByText('Bewaar nieuwe versie'));
    await screen.findByText(/Leerlijn opgeslagen als versie 2/);
    const saved = mocks.saveDevelopment.mock.calls[0][1];
    expect(saved.skillGoals).toHaveLength(5);
    expect(saved.clubGoals).toHaveLength(1);
    expect(saved.skillGoals.find((goal: { ageGroupId: string }) => goal.ageGroupId === 'age_6_8').name.nl).toBe('Aangepast');
    expect(saved.skillGoals.find((goal: { ageGroupId: string }) => goal.ageGroupId === 'age_16_plus').name.nl).toBe('Doel 16+ jaar');
    await fireEvent.change(screen.getByLabelText('Filter op leeftijdsband'), { target: { value: '' } });
    expect(screen.getByText('6-8 jaar · Aangepast · draft')).toBeTruthy();
    expect(screen.getByText('6-8 jaar · Clubdoel · draft')).toBeTruthy();
  });

  it('only imports a local JSON file after an explicit save', async () => {
    mocks.getDevelopment.mockResolvedValue(null);
    mocks.saveDevelopment.mockImplementation(async (expectedVersion, model) => ({ version: expectedVersion + 1, model, savedAt: '', savedBy: 'tc' }));
    render(DevelopmentEditor);
    await screen.findByText('Nog geen ontwikkelleerlijn opgeslagen.');
    const file = new File([''], 'model.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(developmentFixture()) });
    await fireEvent.change(screen.getByLabelText('JSON-bestand laden'), { target: { files: [file] } });
    await screen.findByText('Bestand geladen als concept. Er is nog niets opgeslagen.');
    expect(mocks.saveDevelopment).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText('Bewaar nieuwe versie'));
    await screen.findByText(/Leerlijn opgeslagen als versie 1/);
    expect(mocks.saveDevelopment.mock.calls[0][0]).toBe(0);
    expect(mocks.saveDevelopment.mock.calls[0][1].skillGoals.every((goal: { status: string }) => goal.status === 'draft')).toBe(true);
  });

  it('shows overlapping U12 bands and saves an explicit team choice and override', async () => {
    mocks.saveDevelopmentAssignments.mockImplementation(async (_team, _season, input) => ({
      teamId, seasonId, version: 1, ...input, savedAt: '', savedBy: 'coach',
    }));
    render(DevelopmentTeamGoals, { teamId, seasonId, ageGroup: 'U12' });
    await screen.findByText('Leerlijnversie 1 · teamkeuzeversie nog niet opgeslagen.');
    expect(screen.getByRole('heading', { name: '6-8 jaar' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '11-12 jaar' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '13-15 jaar' })).toBeNull();
    const goal = screen.getByText('Doel 11-12 jaar · vaardigheid · draft').closest('details')!;
    await fireEvent.click(within(goal).getByLabelText('Actief voor dit team'));
    await fireEvent.input(within(goal).getByLabelText('Eigen naam'), { target: { value: 'Ons doel' } });
    await fireEvent.click(screen.getByText('Bewaar ontwikkeldoelen'));
    await screen.findByText('Ontwikkeldoelen voor dit teamseizoen opgeslagen.');
    expect(mocks.saveDevelopmentAssignments).toHaveBeenCalledWith(teamId, seasonId, expect.objectContaining({
      expectedVersion: 0, modelVersion: 1,
      assignments: [expect.objectContaining({ ageGroupId: 'age_11_12', active: true, overrides: { name: 'Ons doel' } })],
    }));
  });

  it('keeps an existing team on its original model version until explicitly updated', async () => {
    mocks.getDevelopmentAssignments.mockResolvedValue({ teamId, seasonId, version: 4, modelVersion: 1, assignments: [], savedAt: '', savedBy: 'coach' });
    mocks.getDevelopment.mockImplementation(async (number?: number) => ({ ...version(), version: number ?? 2 }));
    render(DevelopmentTeamGoals, { teamId, seasonId, ageGroup: 'U12' });
    await screen.findByText('Leerlijnversie 1 · teamkeuzeversie 4.');
    expect(screen.getByText('Kies nieuwere leerlijnversie 2')).toBeTruthy();
    await fireEvent.click(screen.getByText('Kies nieuwere leerlijnversie 2'));
    await screen.findByText('Leerlijnversie 2 · teamkeuzeversie 4.');
    expect(mocks.saveDevelopmentAssignments).not.toHaveBeenCalled();
  });

  it('shows the age-transition report with uncovered carry-over skills', async () => {
    mocks.getTransitionCheck.mockResolvedValue({
      transition: { from: 'U12', to: 'U15' }, modelVersion: 1,
      skills: [
        { id: 'hit_fixture', name: 'Vaardigheid', category: 'hitting', previousLevel: 'foundation', nextLevel: 'developing', nextGoal: 'Volgende stap', covered: true },
        { id: 'pitch_fixture', name: 'Werpen', category: 'pitching', previousLevel: 'introduction', nextLevel: 'foundation', nextGoal: 'Volgende stap', covered: false },
      ],
    });
    render(DevelopmentTeamGoals, { teamId, seasonId, ageGroup: 'U15' });
    await screen.findByRole('heading', { name: 'Leeftijdsovergang U12 → U15' });
    expect(screen.getByText(/Nog niet gedekt door actieve seizoensdoelen: 1 van 2\./)).toBeTruthy();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('✓ gedekt');
    expect(rows[1].textContent).toContain('⚠ niet gedekt');
    expect(rows[1].textContent).toContain('basis leggen');
  });
});
