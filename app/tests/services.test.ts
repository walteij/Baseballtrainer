import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/lib/api';
import { dateNl } from '../src/lib/services/date';
import { icalForSession } from '../src/lib/services/share';
import { accessToken } from '$lib/auth';

vi.mock('$lib/auth', () => ({ accessToken: vi.fn().mockResolvedValue('test-token') }));

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/api');
  vi.restoreAllMocks();
  vi.mocked(accessToken).mockResolvedValue('test-token');
});
afterEach(() => vi.unstubAllGlobals());

describe('live API client', () => {
  it('sends an authenticated request and maps the team response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ teams: [{ id: 'team1', name: 'Team', age_group_id: 'U12' }] }), { status: 200 }));
    expect(await api.listTeams()).toEqual([{ id: 'team1', name: 'Team', age_group_id: 'U12' }]);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/teams', expect.objectContaining({ headers: { authorization: 'Bearer test-token' } }));
  });
  it('surfaces forbidden writes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 403 }));
    await expect(api.assignTrainer('team', 'user')).rejects.toThrow('geen toestemming');
  });
  it('reports an expired session and rejects missing or insecure API configuration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(api.listTeams()).rejects.toThrow('aanmelding is verlopen');
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(api.listTeams()).rejects.toThrow('API-adres is niet geconfigureerd');
    vi.stubEnv('VITE_API_BASE_URL', 'http://example.test/api');
    await expect(api.listTeams()).rejects.toThrow('HTTPS');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('explains why a program cannot be generated without a progression', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'MISSING_PROGRESSION' } }), { status: 422, headers: { 'content-type': 'application/json' } }));
    await expect(api.createProgram('team', { startDate: '2026-01-05', day: 'dinsdag', time: '19:00', duration: 30, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false }))
      .rejects.toThrow('nog geen vaardighedenleerlijn');
  });
  it('shows the generator validation explanation instead of a generic 422', async () => {
    const message = 'Geen volledig seizoensplan mogelijk: de training op 2026-11-18 mist 70 minuten. Er is niets opgeslagen.';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }), { status: 422, headers: { 'content-type': 'application/json' } }));
    await expect(api.createProgram('team', { startDate: '2026-11-13', day: 'woensdag', time: '20:30', duration: 90, phase: 'Winter', location: 'zaal', equipment: [], field: false, cage: false, mound: false }))
      .rejects.toThrow(message);
  });
  it('uses catalog ball identifiers for saved settings and program generation', async () => {
    const settings = { startDate: '2026-11-13', day: 'woensdag', time: '20:30', duration: 90, phase: 'Winter', location: 'zaal', equipment: ['ballen', 'balls', 'gloves', 'net'], field: false, cage: true, mound: true };
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(JSON.stringify(settings)) });
    expect((await api.getSettings('team')).equipment).toEqual(['balls', 'gloves', 'net']);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ program: { id: 'program' }, sessions: [] }), { status: 201 }));
    await api.createProgram('team', settings);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).settings).toEqual({ ...settings, equipment: ['balls', 'gloves', 'net'] });
    expect(settings.equipment).toEqual(['ballen', 'balls', 'gloves', 'net']);
  });
  it('sends goal skill IDs and omits temporary draft IDs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ goals: [] }), { status: 200 }));
    await api.saveTeamSeasonGoals('team', 'season', { age_group_goal_version: 2, selected_generic_goal_ids: [], team_goals: [{ id: 'draft-1', text: 'Samenwerken', source: 'team', skill_ids: ['catch'] }] });
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init?.body)).team_goals).toEqual([{ text: 'Samenwerken', skill_ids: ['catch'] }]);
  });
  it('exports agenda data', () => {
    const session = { id: 's1', team_id: 't1', title: 'Training', date: '2026-01-13', time: '19:30', end: '21:00', phase: 'Winter', location: 'zaal', focus: 'werpen', blocks: [], completed: false, equipment: [] };
    expect(icalForSession(session)).toContain('DTSTART;TZID=Europe/Amsterdam:20260113T193000');
    expect(icalForSession({ ...session, time: '23:30', end: '00:30' })).toContain('DTEND;TZID=Europe/Amsterdam:20260114T003000');
    expect(dateNl(session.date)).toContain('13 jan');
  });
});
