// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const mocks = vi.hoisted(() => ({
  getCurriculum: vi.fn(),
  saveCurriculum: vi.fn(),
}));
vi.mock('$lib/api', () => ({ api: mocks }));
import CurriculumEditor from '../src/lib/components/CurriculumEditor.svelte';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurriculum.mockResolvedValue(null);
});
afterEach(cleanup);

describe('curriculum proposal import', () => {
  it('loads the U15 club proposal into the editor without saving, then publishes it explicitly', async () => {
    mocks.saveCurriculum.mockImplementation(async (_age, input) => ({ age_group_id: 'U15', version: input.expectedVersion + 1, goals: input.goals, skills: input.skills }));
    render(CurriculumEditor);
    await screen.findByText('Nog geen leerlijn vastgesteld.');
    await fireEvent.change(screen.getByLabelText('Leeftijdscategorie'), { target: { value: 'U15' } });
    await screen.findByText('Nog geen leerlijn vastgesteld.');
    await fireEvent.click(screen.getByRole('button', { name: 'Laad clubvoorstel' }));
    await screen.findByText(/Clubvoorstel geladen als concept/);
    expect(mocks.saveCurriculum).not.toHaveBeenCalled();
    const skillIds = screen.getAllByLabelText('Vaardigheids-ID').map(input => (input as HTMLInputElement).value);
    expect(skillIds).toEqual(['mechanics', 'contact', 'timing', 'groundballs', 'flyballs', 'throwing', 'receiving', 'starts', 'reads', 'communication']);
    await fireEvent.click(screen.getByRole('button', { name: 'Stel leerlijn vast' }));
    await screen.findByText(/Versie 1 vastgesteld/);
    const saved = mocks.saveCurriculum.mock.calls[0];
    expect(saved[0]).toBe('U15');
    expect(saved[1].goals).toHaveLength(6);
    expect(saved[1].skills).toHaveLength(10);
  });
});
