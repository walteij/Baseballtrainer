const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (items: object) => ({ type: 'array', items });
const obj = (properties: Record<string, object>, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const str = { type: 'string' };
const uuid = { type: 'string', format: 'uuid' };
const age = { type: 'string', enum: ['Beeball', 'U12', 'U15', 'U21', 'Senioren'] };
const version = { type: 'integer', minimum: 1 };
const sources = array(str);
const schemas: Record<string, object> = {
  Error: obj({ error: obj({ code: str, message: str, details: { type: 'object', additionalProperties: true } }, ['code', 'message']) }),
  Health: obj({ status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] }, services: { type: 'object', additionalProperties: { type: 'string', enum: ['healthy', 'unhealthy'] } } }),
  Team: obj({ id: uuid, name: str, age_group_id: age, created_at: str, updated_at: str }, ['id', 'name', 'age_group_id']),
  TeamSeason: obj({ id: uuid, team_id: uuid, year: { type: 'integer' }, age_group_id: age, name: str, created_at: str }, ['id', 'team_id', 'year', 'age_group_id']),
  ProgramSettings: obj({ startDate: { type: 'string', format: 'date' }, day: str, time: str, duration: { type: 'integer', minimum: 15, maximum: 240 }, phase: str, location: str, equipment: sources, field: { type: 'boolean' }, cage: { type: 'boolean' }, mound: { type: 'boolean' } }),
  ProgramDevelopmentSteering: obj({ season_id: uuid, model_version: version, assignments_version: version, categories: sources }),
  Program: obj({ id: uuid, team_id: uuid, settings: ref('ProgramSettings'), created_at: str, development: ref('ProgramDevelopmentSteering') }, ['id', 'team_id', 'settings', 'created_at']),
  Session: obj({ id: uuid, team_id: uuid, program_id: uuid, title: str, date: str, time: str, end: str, phase: str, location: str, focus: str, blocks: array(obj({ id: uuid, time: str, title: str, minutes: { type: 'integer' }, detail: str, drill_id: str }, ['id', 'time', 'title', 'minutes', 'detail'])), completed: { type: 'boolean' }, completed_items: sources, equipment: sources }),
  Skill: obj({ id: str, name: str, description: str }),
  SkillProgression: obj({ id: str, skill_id: str, age_group_id: age, level: { type: 'integer' }, description: str, version }),
  TeamSkillProgress: obj({ id: str, team_id: uuid, skill_id: str, status: { type: 'string', enum: ['introduced', 'developing', 'proficient'] }, notes: str, updated_at: str }, ['id', 'team_id', 'skill_id', 'status', 'updated_at']),
  AgeGroupGoal: obj({ id: uuid, age_group_id: age, version, text: str, skill_ids: sources }),
  CurriculumSkill: obj({ id: str, name: str, description: str, level: { type: 'integer', minimum: 1, maximum: 10 }, progression: str }),
  CurriculumGoal: obj({ id: uuid, text: str, skill_ids: sources }, ['text', 'skill_ids']),
  Curriculum: obj({ age_group_id: age, version, goals: array(ref('CurriculumGoal')), skills: array(ref('CurriculumSkill')) }),
  DevelopmentModel: {
    ...obj({
      schemaVersion: str, ageGroups: array({ type: 'object' }), taxonomy: array({ type: 'object' }),
      skillGoals: array({ type: 'object' }), clubGoals: array({ type: 'object' }),
    }),
    description: 'Complete development model; validated against the shared development schema and reference integrity rules.',
  },
  DevelopmentVersion: obj({ version, model: ref('DevelopmentModel'), savedAt: { type: 'string', format: 'date-time' }, savedBy: uuid }),
  DevelopmentAssignment: obj({
    id: str, teamId: uuid, seasonId: uuid, ageGroupId: str,
    goalType: { type: 'string', enum: ['skill_goal', 'club_goal'] }, goalId: str, active: { type: 'boolean' },
    priority: { type: 'integer', minimum: 1, maximum: 5 }, coachNote: str,
    overrides: obj({ name: str, description: str, masteryTargetPercentage: { type: 'number', minimum: 0, maximum: 100 } }, []),
  }, ['id', 'teamId', 'seasonId', 'ageGroupId', 'goalType', 'goalId', 'active', 'priority']),
  DevelopmentAssignments: obj({ teamId: uuid, seasonId: uuid, version, modelVersion: version, assignments: array(ref('DevelopmentAssignment')), savedAt: { type: 'string', format: 'date-time' }, savedBy: uuid }),
  TransitionCheck: obj({
    transition: { ...obj({ from: age, to: age }), nullable: true },
    modelVersion: { type: 'integer', minimum: 1, nullable: true },
    skills: array(obj({ id: str, name: str, category: str, previousLevel: str, nextLevel: str, nextGoal: str, covered: { type: 'boolean' } })),
  }),
  ComposedGoal: obj({ id: uuid, text: str, source: { type: 'string', enum: ['generiek', 'team'] }, generic_goal_version: version, season_id: uuid, team_id: uuid, skill_ids: sources }, ['id', 'text', 'source', 'season_id', 'team_id', 'skill_ids']),
  GoalComposition: obj({ id: str, team_id: uuid, season_id: uuid, age_group_goal_version: version, goals: array(ref('ComposedGoal')), selected_generic_goal_ids: array(uuid), team_goal_ids: array(uuid), created_at: str }),
  Drill: obj({
    id: str, name_nl: str, category: str, subcategories: sources, skills: sources,
    duration_minutes: obj({ default: { type: 'number' }, minimum: { type: 'number' }, maximum: { type: 'number' } }),
    players_min: { type: 'number' }, players_max: { type: 'number' }, equipment_required: sources, equipment_optional: sources,
    indoor_friendly: { type: 'boolean' }, space_required: str, difficulty: str, description: str,
    setup: sources, execution: sources, coaching_points: sources, common_mistakes: sources, safety_notes: sources,
    variations: array(obj({ name: str, difficulty: str, description: str })),
    youtube: { ...obj({ url: str, title: str, start_seconds: { type: 'number' } }), nullable: true },
    selection: obj({ minimum_repeat_gap_days: { type: 'number' }, preferred_session_blocks: sources }),
  }),
  Warmup: obj({ duration_minutes: { type: 'number' }, blocks: array(obj({ name: str, duration_minutes: { type: 'number' }, items: sources })) }),
};
const param = (name: string, schema: object, location: 'path' | 'query' = 'path', required = true) => ({ name, in: location, required, schema });
const pathId = (name: string) => param(name, name === 'ageGroupId' ? age : name === 'skillId' ? str : uuid);
function operation(summary: string, result: object, status = 200, options: { params?: object[]; body?: object; errors?: number[]; media?: string } = {}) {
  return {
    summary, parameters: options.params ?? [],
    ...(options.body ? { requestBody: { required: true, content: { 'application/json': { schema: options.body } } } } : {}),
    responses: {
      [status]: status === 204 ? { description: 'Success' } : { description: 'Success', content: { [options.media ?? 'application/json']: { schema: result } } },
      ...Object.fromEntries([...new Set([401, 403, ...(options.errors ?? [400, 422, 500])])].map(code => [code, { description: 'Error', content: { 'application/json': { schema: ref('Error') } } }])),
    },
  };
}
const progressInput = obj({ status: { type: 'string', enum: ['introduced', 'developing', 'proficient'] }, notes: str }, ['status']);
export const openapi = {
  openapi: '3.0.3', info: { title: 'Honkbal Trainer API', version: '1.0.0', description: 'Requires a delegated Microsoft Entra access token and the assigned Trainer role. Do not store youth player personal data.' },
  servers: [{ url: '/api' }], security: [{ bearerAuth: [] }],
  paths: {
    '/me': { get: operation('Current user and committee membership', obj({ objectId: uuid, isCommittee: { type: 'boolean' } })) },
    '/health': { get: { ...operation('Health', ref('Health'), 200, { errors: [] }), responses: { '200': { description: 'Healthy or degraded', content: { 'application/json': { schema: ref('Health') } } }, '401': { description: 'Missing or invalid access token', content: { 'application/json': { schema: ref('Error') } } }, '403': { description: 'Not assigned the Trainer role or required scope', content: { 'application/json': { schema: ref('Error') } } }, '503': { description: 'Unhealthy or authentication unavailable', content: { 'application/json': { schema: { oneOf: [ref('Health'), ref('Error')] } } } } } } },
    '/catalog': { get: operation('Catalog', obj({ drills: array(ref('Drill')), categories: { type: 'object', additionalProperties: sources }, warmup: ref('Warmup') })) },
    '/programs': { post: operation('Create program', obj({ program: ref('Program'), sessions: array(ref('Session')) }), 201, { body: obj({ team_id: uuid, settings: ref('ProgramSettings') }), errors: [400, 404, 422, 500, 503] }) },
    '/programs/{id}': { get: operation('Get program', obj({ program: ref('Program') }), 200, { params: [pathId('id')], errors: [404, 422, 500] }) },
    '/programs/{id}/sessions': { get: operation('List sessions', obj({ sessions: array(ref('Session')) }), 200, { params: [pathId('id')], errors: [404, 422, 500] }) },
    '/sessions/{id}/completion': { put: operation('Update completion', obj({ session: ref('Session') }), 200, { params: [pathId('id')], body: obj({ completed: { type: 'boolean' }, completedItems: sources }), errors: [400, 404, 422, 500] }) },
    '/sessions/{id}/ical': { get: operation('iCalendar export', str, 200, { params: [pathId('id')], media: 'text/calendar', errors: [404, 422, 500] }) },
    '/teams': { get: operation('List teams', obj({ teams: array(ref('Team')) })), post: operation('Create team', obj({ team: ref('Team') }), 201, { body: obj({ name: str, age_group_id: age }) }) },
    '/teams/{id}': { patch: operation('Update team', obj({ team: ref('Team') }), 200, { params: [pathId('id')], body: obj({ name: str, age_group_id: age }, []), errors: [400, 404, 422, 500] }) },
    '/skills/progression': { get: operation('Skill progression', obj({ skills: array(ref('Skill')), progressions: array(ref('SkillProgression')) }), 200, { params: [param('age_group_id', age, 'query')] }) },
    '/age-groups/{ageGroupId}/curriculum': {
      get: operation('Get current club curriculum', obj({ curriculum: { ...ref('Curriculum'), nullable: true } }), 200, { params: [pathId('ageGroupId')] }),
      put: operation('Publish club curriculum (Committee only)', obj({ curriculum: ref('Curriculum') }), 200, { params: [pathId('ageGroupId')], body: obj({ expectedVersion: { type: 'integer', minimum: 0 }, goals: array(ref('CurriculumGoal')), skills: array(ref('CurriculumSkill')) }), errors: [400, 409, 422, 500] }),
    },
    '/development-model': {
      get: operation('Get a development model version', obj({ development: { ...ref('DevelopmentVersion'), nullable: true } }), 200, { params: [param('version', version, 'query', false)] }),
      put: operation('Save a new development model version (Committee only)', obj({ development: ref('DevelopmentVersion') }), 200, { body: obj({ expectedVersion: { type: 'integer', minimum: 0 }, model: ref('DevelopmentModel') }), errors: [400, 409, 422, 500] }),
    },
    '/teams/{teamId}/seasons/{seasonId}/development-goals': {
      get: operation('Get team development goals', obj({ developmentAssignments: { ...ref('DevelopmentAssignments'), nullable: true } }), 200, { params: [pathId('teamId'), pathId('seasonId')], errors: [404, 422, 500] }),
      put: operation('Save team development goals (assigned trainer or Committee)', obj({ developmentAssignments: ref('DevelopmentAssignments') }), 200, { params: [pathId('teamId'), pathId('seasonId')], body: obj({ expectedVersion: { type: 'integer', minimum: 0 }, modelVersion: version, assignments: array(ref('DevelopmentAssignment')) }), errors: [400, 404, 409, 422, 500] }),
    },
    '/teams/{teamId}/seasons/{seasonId}/transition-check': {
      get: operation('Check which development skills carry over at an age-group transition and whether season goals cover them', obj({ transitionCheck: ref('TransitionCheck') }), 200, { params: [pathId('teamId'), pathId('seasonId')], errors: [404, 422, 500] }),
    },
    '/teams/{id}/skill-progress': { get: operation('Team progress', obj({ skillProgress: array(ref('TeamSkillProgress')) }), 200, { params: [pathId('id')], errors: [404, 422, 500] }) },
    '/teams/{id}/skill-progress/{skillId}': { put: operation('Update team progress', obj({ skillProgress: ref('TeamSkillProgress') }), 200, { params: [pathId('id'), pathId('skillId')], body: progressInput, errors: [400, 404, 422, 500] }) },
    '/age-groups/{ageGroupId}/goals': { get: operation('Age group goals', obj({ ageGroupId: age, version, goals: array(ref('AgeGroupGoal')) }), 200, { params: [pathId('ageGroupId'), param('version', version, 'query', false)], errors: [404, 422, 500] }) },
    '/teams/{teamId}/seasons': {
      get: operation('List team seasons', obj({ seasons: array(ref('TeamSeason')) }), 200, { params: [pathId('teamId')], errors: [404, 422, 500] }),
      post: operation('Create season', obj({ teamSeason: ref('TeamSeason') }), 201, { params: [pathId('teamId')], body: obj({ year: { type: 'integer', minimum: 2000, maximum: 2200 }, age_group_id: age, name: str }, ['year', 'age_group_id']), errors: [400, 404, 409, 422, 500] })
    },
    '/teams/{teamId}/sessions': { get: operation('List team sessions', obj({ sessions: array(ref('Session')) }), 200, { params: [pathId('teamId')], errors: [404, 422, 500] }) },
    '/teams/{teamId}/seasons/{seasonId}/goals': {
      get: operation('Get composed goals', obj({ ageGroupGoalVersion: version, goals: array(ref('ComposedGoal')), sources }), 200, { params: [pathId('teamId'), pathId('seasonId')], errors: [404, 422, 500] }),
      put: operation('Save composed goals', obj({ composition: ref('GoalComposition'), goals: array(ref('ComposedGoal')) }), 200, { params: [pathId('teamId'), pathId('seasonId')], body: obj({ age_group_goal_version: version, selected_generic_goal_ids: array(uuid), team_goals: array(obj({ id: uuid, text: str, skill_ids: sources }, ['text', 'skill_ids'])) }), errors: [400, 404, 409, 422, 500] }),
    },
    '/teams/{teamId}/trainers': {
      get: operation('List trainer assignments (committee only)', obj({ assignments: array(obj({ objectId: uuid })) }), 200, { params: [pathId('teamId')], errors: [404, 422, 500] }),
    },
    '/teams/{teamId}/trainers/{objectId}': {
      put: operation('Assign trainer to team (committee only)', {}, 204, { params: [pathId('teamId'), pathId('objectId')], errors: [404, 422, 500] }),
      delete: operation('Remove trainer assignment (committee only)', {}, 204, { params: [pathId('teamId'), pathId('objectId')], errors: [404, 422, 500] }),
    },
  }, components: { schemas, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
};
