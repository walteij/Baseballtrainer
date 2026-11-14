// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';

const mocks = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getCatalog: vi.fn(),
  getCurriculum: vi.fn(),
  getDevelopment: vi.fn(),
  createTeam: vi.fn(),
  createTeamSeason: vi.fn(),
  getSettings: vi.fn(),
  listTeamSeasons: vi.fn(),
  getAgeGroupGoals: vi.fn(),
  listAssignments: vi.fn(),
  setPage: (_url: URL) => {},
}));

vi.mock('$lib/api', () => ({ api: mocks }));
vi.mock('$lib/auth', async () => {
  const { writable } = await import('svelte/store');
  return { identity: writable({ objectId: 'committee', isCommittee: true }) };
});
vi.mock('$app/stores', async () => {
  const { writable } = await import('svelte/store');
  const page = writable({ url: new URL('https://example.test/beheer') });
  mocks.setPage = (url: URL) => page.set({ url });
  return { page };
});

import AppPage from '../src/lib/components/AppPage.svelte';
import { activeTeam } from '../src/lib/stores/team';

beforeEach(() => {
  vi.resetAllMocks();
  activeTeam.set('');
  localStorage.clear();
  mocks.setPage(new URL('https://example.test/beheer'));
  mocks.listTeams.mockResolvedValue([]);
  mocks.getCurriculum.mockResolvedValue(null);
  mocks.getDevelopment.mockResolvedValue(null);
  mocks.getCatalog.mockResolvedValue({
    drills: [{
      id: 'drill-1', name_nl: 'Werp oefening', category: 'Werpen', description: 'Oefening',
      equipment_required: [], skills: [], subcategories: [], players_min: 2, players_max: 8, duration_minutes: { minimum: 10, maximum: 15 },
      difficulty: 'basis', indoor_friendly: true,
      equipment_optional: [], setup: [], execution: [], coaching_points: [], common_mistakes: [], safety_notes: [], variations: [],
      youtube: { url: 'https://www.youtube.com/watch?v=example1234', title: 'Werptechniek', start_seconds: 12 },
    }],
    categories: { Werpen: [] }, warmup: { duration_minutes: 0, blocks: [] },
  });
});

afterEach(cleanup);

describe('first use without teams', () => {
  it('loads the management page and creates the first team and season', async () => {
    const team = { id: 'team-1', name: 'U12 Blauw', age_group_id: 'U12' };
    mocks.createTeam.mockImplementation(async () => { mocks.listTeams.mockResolvedValue([team]); return team; });
    mocks.createTeamSeason.mockResolvedValue({ id: 'season-1' });
    mocks.getSettings.mockResolvedValue(null);
    mocks.listTeamSeasons.mockResolvedValue([]);
    mocks.getAgeGroupGoals.mockResolvedValue(null);
    mocks.listAssignments.mockResolvedValue([]);

    render(AppPage);
    await screen.findByText('Maak team voor seizoen');
    await fireEvent.input(screen.getByLabelText('Teamnaam'), { target: { value: 'U12 Blauw' } });
    await fireEvent.click(screen.getByText('Maak team voor seizoen'));
    await waitFor(() => expect(mocks.createTeam).toHaveBeenCalledWith({ name: 'U12 Blauw', age_group_id: 'U12' }));
    await waitFor(() => expect(mocks.createTeamSeason).toHaveBeenCalledWith('team-1', expect.objectContaining({ age_group_id: 'U12' })));
    await screen.findByText('Team voor seizoen aangemaakt.');
  });

  it('shows the drill catalog without requiring a team', async () => {
    mocks.setPage(new URL('https://example.test/drills'));
    render(AppPage);
    await screen.findByText('Werp oefening');
    expect(mocks.getCatalog).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Gegevens worden geladen')).toBeNull();
  });

  it('loads YouTube only after consent and sets an explicit origin referrer policy', async () => {
    mocks.setPage(new URL('https://example.test/drills/drill-1'));
    render(AppPage);
    const loadVideo = await screen.findByRole('button', { name: /Klik om video te laden/ });
    expect(screen.queryByTitle('Werptechniek')).toBeNull();
    const fallback = screen.getByRole('link', { name: 'Open video op YouTube' });
    expect(fallback.getAttribute('href')).toBe('https://www.youtube.com/watch?v=example1234');
    expect(fallback.getAttribute('rel')).toContain('noopener');
    await fireEvent.click(loadVideo);
    const player = await screen.findByTitle('Werptechniek');
    expect(player.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/example1234?start=12');
    expect(player.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
  });

  it('separates users and team administration from skills and goals', async () => {
    mocks.setPage(new URL('https://example.test/beheer/users'));
    const rendered = render(AppPage);
    await screen.findByText('Maak team voor seizoen');
    expect(screen.queryByText('Ontwikkelleerlijn voor de club')).toBeNull();
    expect(screen.getByRole('link', { name: 'Skills' }).getAttribute('href')).toBe('/beheer/skills');
    rendered.unmount();
    mocks.setPage(new URL('https://example.test/beheer/skills'));
    render(AppPage);
    await screen.findByText('Ontwikkelleerlijn voor de club');
    expect(screen.queryByText('Maak team voor seizoen')).toBeNull();
    expect(screen.getByRole('link', { name: 'Users' }).getAttribute('href')).toBe('/beheer/users');
  });

  it('reloads management data when navigating between sections without remounting', async () => {
    const team = { id: 'team-1', name: 'U12 Blauw', age_group_id: 'U12' };
    mocks.setPage(new URL('https://example.test/beheer/users'));
    mocks.listTeams.mockResolvedValue([team]);
    mocks.getSettings.mockResolvedValue(null);
    mocks.listTeamSeasons.mockResolvedValue([]);
    mocks.getAgeGroupGoals.mockResolvedValue(null);
    mocks.listAssignments.mockResolvedValue([]);
    activeTeam.set(team.id);
    render(AppPage);
    await screen.findByText('Maak team voor seizoen');
    expect(mocks.getAgeGroupGoals).not.toHaveBeenCalled();
    mocks.setPage(new URL('https://example.test/beheer/skills'));
    await screen.findByText('Ontwikkelleerlijn voor de club');
    await waitFor(() => expect(mocks.getAgeGroupGoals).toHaveBeenCalledWith('U12'));
    expect(screen.queryByText('Maak team voor seizoen')).toBeNull();
  });

  it('shows the empty-team message on team-dependent pages', async () => {
    mocks.setPage(new URL('https://example.test/'));
    render(AppPage);
    await screen.findByText(/Er zijn nog geen teams beschikbaar/);
    expect(mocks.getCatalog).not.toHaveBeenCalled();
  });
});
