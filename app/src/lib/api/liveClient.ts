import { accessToken } from '$lib/auth';
import type { AgeGroup, ApiClient, Catalog, Curriculum, DevelopmentAssignments, DevelopmentVersion, Goal, Program, Session, Settings, Skill, Team, TeamSeason, TransitionCheck } from './types';

class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function endpoint(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (!configured) throw new Error('Het API-adres is niet geconfigureerd.');
  const url = new URL(configured);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Het API-adres moet HTTPS gebruiken.');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('Ongeldig API-adres.');
  return url.href.replace(/\/$/, '');
}

async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`${endpoint()}${path}`, {
    method,
    headers: { authorization: `Bearer ${await accessToken()}`, ...(data === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new ApiError(401, 'Je aanmelding is verlopen. Meld je opnieuw aan.');
    if (response.status === 403) throw new ApiError(403, 'Je hebt geen toestemming voor deze actie.');
    if (response.status === 409) throw new ApiError(409, 'De gegevens zijn intussen gewijzigd. Laad opnieuw en probeer nogmaals.');
    if (response.status === 422 && response.headers.get('content-type')?.includes('application/json')) {
      const payload: unknown = await response.json();
      if (typeof payload === 'object' && payload !== null && 'error' in payload &&
          typeof payload.error === 'object' && payload.error !== null && 'code' in payload.error) {
        if (payload.error.code === 'MISSING_PROGRESSION') {
          throw new ApiError(422, 'Voor deze leeftijdscategorie is nog geen vaardighedenleerlijn ingesteld. Vraag de TC om deze vast te stellen.');
        }
        if (payload.error.code === 'VALIDATION_ERROR' && 'message' in payload.error &&
            typeof payload.error.message === 'string' && payload.error.message.trim()) {
          throw new ApiError(422, payload.error.message);
        }
      }
    }
    throw new ApiError(response.status, `De API gaf een fout (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const segment = (value: string) => encodeURIComponent(value);
type ApiSession = Omit<Session, 'blocks'> & { blocks: Array<Omit<Session['blocks'][number], 'drillId'> & { drill_id?: string }> };
const session = (value: ApiSession): Session => ({ ...value, blocks: value.blocks.map(({ drill_id, ...block }) => ({ ...block, drillId: drill_id })) });
type ApiGoal = { id: string; text: string; skill_ids: string[]; source?: 'generiek' | 'team'; generic_goal_version?: number; version?: number };
const goal = (value: ApiGoal): Goal => ({ id: value.id, text: value.text, skill_ids: value.skill_ids, source: value.source ?? 'generiek', version: value.generic_goal_version ?? value.version });
const catalogSettings = (settings: Settings): Settings => ({
  ...settings,
  equipment: [...new Set(settings.equipment.map(item => item === 'ballen' ? 'balls' : item))],
});

export const liveClient: ApiClient = {
  health: async () => {
    const value = await request<{ status: string; services: Record<string, string> }>('/health');
    return { status: value.status, services: Object.entries(value.services).map(([name, status]) => `${name}: ${status}`) };
  },
  getCatalog: () => request<Catalog>('/catalog'),
  listTeams: async () => (await request<{ teams: Team[] }>('/teams')).teams,
  createTeam: async input => (await request<{ team: Team }>('/teams', 'POST', input)).team,
  updateTeam: async (id, input) => (await request<{ team: Team }>(`/teams/${segment(id)}`, 'PATCH', input)).team,
  createTeamSeason: async (teamId, input) => (await request<{ teamSeason: TeamSeason }>(`/teams/${segment(teamId)}/seasons`, 'POST', input)).teamSeason,
  listTeamSeasons: async teamId => (await request<{ seasons: TeamSeason[] }>(`/teams/${segment(teamId)}/seasons`)).seasons,
  listTeamSessions: async teamId => (await request<{ sessions: ApiSession[] }>(`/teams/${segment(teamId)}/sessions`)).sessions.map(session),
  createProgram: async (teamId, settings) => {
    const result = await request<{ program: Program; sessions: ApiSession[] }>('/programs', 'POST', { team_id: teamId, settings: catalogSettings(settings) });
    return { program: result.program, sessions: result.sessions.map(session) };
  },
  getProgram: async id => {
    try { return (await request<{ program: Program }>(`/programs/${segment(id)}`)).program; }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  listProgramSessions: async id => (await request<{ sessions: ApiSession[] }>(`/programs/${segment(id)}/sessions`)).sessions.map(session),
  updateSessionCompletion: async (id, completed, completedItems) => session((await request<{ session: ApiSession }>(`/sessions/${segment(id)}/completion`, 'PUT', { completed, completedItems })).session),
  getSessionIcal: async id => {
    const response = await fetch(`${endpoint()}/sessions/${segment(id)}/ical`, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok) throw new ApiError(response.status, `iCalendar export mislukt (${response.status}).`);
    return response.text();
  },
  getSkillProgression: async (ageGroup: AgeGroup) => {
    const result = await request<{ skills: Skill[]; progressions: { description: string }[] }>(`/skills/progression?age_group_id=${segment(ageGroup)}`);
    return { skills: result.skills, progressions: result.progressions.map(item => item.description) };
  },
  getTeamSkillProgress: async teamId => {
    const [progress, teams] = await Promise.all([
      request<{ skillProgress: { skill_id: string; status: string; notes?: string }[] }>(`/teams/${segment(teamId)}/skill-progress`),
      request<{ teams: Team[] }>('/teams'),
    ]);
    const team = teams.teams.find(item => item.id === teamId);
    if (!team) throw new Error('Team niet gevonden.');
    const catalog = await request<{ skills: Skill[] }>(`/skills/progression?age_group_id=${segment(team.age_group_id)}`);
    return progress.skillProgress.map(item => {
      const definition = catalog.skills.find(skill => skill.id === item.skill_id);
      return { id: item.skill_id, name: definition?.name ?? item.skill_id, description: [item.status, item.notes].filter(Boolean).join(' · ') };
    });
  },
  updateTeamSkillProgress: async (teamId, skillId, status, notes) => {
    await request(`/teams/${segment(teamId)}/skill-progress/${segment(skillId)}`, 'PUT', { status, ...(notes ? { notes } : {}) });
    const progress = await liveClient.getTeamSkillProgress(teamId);
    const updated = progress.find(item => item.id === skillId);
    if (!updated) throw new Error('Bijgewerkte vaardigheid niet gevonden.');
    return updated;
  },
  getAgeGroupGoals: async (ageGroup, version) => {
    try {
      const result = await request<{ ageGroupId: AgeGroup; version: number; goals: ApiGoal[] }>(`/age-groups/${segment(ageGroup)}/goals${version ? `?version=${version}` : ''}`);
      return { ...result, goals: result.goals.map(goal) };
    } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  getTeamSeasonGoals: async (teamId, seasonId) => {
    try {
      const result = await request<{ ageGroupGoalVersion: number; goals: ApiGoal[]; sources: string[] }>(`/teams/${segment(teamId)}/seasons/${segment(seasonId)}/goals`);
      return { ...result, goals: result.goals.map(goal) };
    } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  saveTeamSeasonGoals: async (teamId, seasonId, input) => {
    const team_goals = input.team_goals.map(item => ({ ...(item.id.startsWith('draft-') ? {} : { id: item.id }), text: item.text, skill_ids: item.skill_ids }));
    const result = await request<{ goals: ApiGoal[] }>(`/teams/${segment(teamId)}/seasons/${segment(seasonId)}/goals`, 'PUT', { ...input, team_goals });
    return { goals: result.goals.map(goal) };
  },
  getSettings: async teamId => {
    const saved = localStorage.getItem(`settings:${teamId}`);
    if (saved) return catalogSettings(JSON.parse(saved) as Settings);
    return { startDate: new Date().toISOString().slice(0, 10), day: 'dinsdag', time: '19:00', duration: 90, phase: 'Winter', location: 'zaal — laag plafond', equipment: [], field: false, cage: false, mound: false };
  },
  saveSettings: async (teamId, settings) => { localStorage.setItem(`settings:${teamId}`, JSON.stringify(settings)); return settings; },
  getIdentity: () => request('/me'),
  getCurriculum: async ageGroup => (await request<{ curriculum: Curriculum | null }>(`/age-groups/${segment(ageGroup)}/curriculum`)).curriculum,
  saveCurriculum: async (ageGroup, input) => (await request<{ curriculum: Curriculum }>(`/age-groups/${segment(ageGroup)}/curriculum`, 'PUT', input)).curriculum,
  getDevelopment: async version => (await request<{ development: DevelopmentVersion | null }>(`/development-model${version ? `?version=${version}` : ''}`)).development,
  saveDevelopment: async (expectedVersion, model) => (await request<{ development: DevelopmentVersion }>('/development-model', 'PUT', { expectedVersion, model })).development,
  getDevelopmentAssignments: async (teamId, seasonId) => (await request<{ developmentAssignments: DevelopmentAssignments | null }>(`/teams/${segment(teamId)}/seasons/${segment(seasonId)}/development-goals`)).developmentAssignments,
  saveDevelopmentAssignments: async (teamId, seasonId, input) => (await request<{ developmentAssignments: DevelopmentAssignments }>(`/teams/${segment(teamId)}/seasons/${segment(seasonId)}/development-goals`, 'PUT', input)).developmentAssignments,
  getTransitionCheck: async (teamId, seasonId) => (await request<{ transitionCheck: TransitionCheck }>(`/teams/${segment(teamId)}/seasons/${segment(seasonId)}/transition-check`)).transitionCheck,
  listAssignments: async teamId => (await request<{ assignments: { objectId: string }[] }>(`/teams/${segment(teamId)}/trainers`)).assignments,
  assignTrainer: async (teamId, objectId) => { await request<void>(`/teams/${segment(teamId)}/trainers/${segment(objectId)}`, 'PUT'); },
  unassignTrainer: async (teamId, objectId) => { await request<void>(`/teams/${segment(teamId)}/trainers/${segment(objectId)}`, 'DELETE'); },
};
