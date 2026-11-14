import { z } from 'zod';

const localizedText = z.object({ nl: z.string().min(1), en: z.string().optional() }).strict();
const ageGroup = z.object({
  id: z.string().regex(/^age_[a-z0-9_]+$/),
  name: z.string().min(1),
  minAge: z.number().int().min(4).max(99),
  maxAge: z.number().int().min(4).max(99).nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
  tcNotes: z.string().optional(),
}).strict();
const criterion = z.object({
  id: z.string().regex(/^mc_[a-z0-9_]+$/),
  description: localizedText,
  measurementType: z.enum(['attempt_ratio', 'scenario_ratio', 'observation', 'time', 'percentage', 'checklist']),
  target: z.object({
    successfulAttempts: z.number().int().min(0).optional(),
    totalAttempts: z.number().int().min(1).optional(),
    percentage: z.number().min(0).max(100).optional(),
    secondsMax: z.number().positive().optional(),
    required: z.boolean().optional(),
  }).strict().refine(value => Object.keys(value).length > 0, 'Een streefwaarde is verplicht'),
  evidence: z.array(z.enum(['coach_observation', 'drill_result', 'game_observation', 'video', 'player_reflection'])).min(1),
  notes: z.string().optional(),
}).strict();
const progression = z.object({
  id: z.string().regex(/^prog_[a-z0-9_]+$/),
  ageGroupId: z.string().regex(/^age_[a-z0-9_]+$/),
  level: z.enum(['awareness', 'introduction', 'foundation', 'developing', 'proficient', 'advanced']),
  goal: localizedText,
  masteryCriteria: z.array(criterion).min(1),
  editable: z.literal(true),
  tcNotes: z.string().optional(),
}).strict();
const skill = z.object({
  id: z.string().regex(/^(hit|pitch|catch|inf|out|run|throw|game|physical|mental)_[a-z0-9_]+$/),
  name: localizedText,
  description: localizedText,
  ageProgressions: z.array(progression).min(1),
  tags: z.array(z.string()).optional(),
  active: z.boolean(),
}).strict();
const category = z.object({
  id: z.enum(['hitting', 'pitching', 'catching', 'infield', 'outfield', 'baserunning', 'throwing', 'game_awareness', 'physical', 'mental']),
  name: z.string(),
  sortOrder: z.number().int().min(0),
  skills: z.array(skill),
}).strict();
const status = z.enum(['draft', 'approved', 'archived']);
const skillGoal = z.object({
  id: z.string().regex(/^sg_[a-z0-9_]+$/),
  name: localizedText,
  description: localizedText,
  categoryId: z.string(),
  ageGroupId: z.string(),
  skillIds: z.array(z.string()).min(1),
  masteryCriteria: z.array(criterion).min(1),
  status,
  editable: z.literal(true),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  tcNotes: z.string().optional(),
}).strict();
const successMetric = z.object({
  id: z.string().regex(/^metric_[a-z0-9_]+$/),
  metric: z.enum(['players_assessed_percentage', 'players_mastered_percentage', 'teams_using_goal_percentage', 'coach_review_completed', 'season_improvement_percentage']),
  target: z.number().min(0).max(100),
  reviewFrequency: z.enum(['monthly', 'quarterly', 'midseason', 'end_of_season']),
}).strict();
const clubGoal = z.object({
  id: z.string().regex(/^cg_[a-z0-9_]+$/),
  name: localizedText,
  description: localizedText,
  ageGroupId: z.string(),
  skillGoalIds: z.array(z.string()).min(1),
  successMetrics: z.array(successMetric).min(1),
  priority: z.number().int().min(1).max(5),
  status,
  editable: z.literal(true),
  seasonId: z.string().nullable().optional(),
  tcNotes: z.string().optional(),
}).strict();

export const DevelopmentModelSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  ageGroups: z.array(ageGroup).min(1),
  taxonomy: z.array(category).min(10),
  skillGoals: z.array(skillGoal),
  clubGoals: z.array(clubGoal),
}).strict().superRefine((model, context) => {
  const issue = (path: (string | number)[], message: string) =>
    context.addIssue({ code: 'custom', path, message });
  const unique = (ids: string[], path: (string | number)[]) => {
    if (new Set(ids).size !== ids.length) issue(path, 'Dubbele ID of verwijzing');
  };
  unique(model.ageGroups.map(item => item.id), ['ageGroups']);
  unique(model.taxonomy.map(item => item.id), ['taxonomy']);
  unique(model.skillGoals.map(item => item.id), ['skillGoals']);
  unique(model.clubGoals.map(item => item.id), ['clubGoals']);
  const ages = new Set(model.ageGroups.map(item => item.id));
  const categories = new Set<string>(model.taxonomy.map(item => item.id));
  const skills = model.taxonomy.flatMap(item => item.skills);
  unique(skills.map(item => item.id), ['taxonomy']);
  const skillIds = new Set(skills.map(item => item.id));
  unique(skills.flatMap(item => item.ageProgressions.map(prog => prog.id)), ['taxonomy']);
  const goals = new Map(model.skillGoals.map(item => [item.id, item]));
  model.ageGroups.forEach((item, index) => {
    if (item.maxAge !== null && item.maxAge < item.minAge) issue(['ageGroups', index, 'maxAge'], 'Maximumleeftijd ligt onder minimumleeftijd');
  });
  model.taxonomy.forEach((item, i) => item.skills.forEach((entry, j) => {
    if (entry.tags) unique(entry.tags, ['taxonomy', i, 'skills', j, 'tags']);
    entry.ageProgressions.forEach((prog, k) => {
      if (!ages.has(prog.ageGroupId)) issue(['taxonomy', i, 'skills', j, 'ageProgressions', k, 'ageGroupId'], 'Onbekende leeftijdsband');
    });
  }));
  model.skillGoals.forEach((goal, i) => {
    if (!ages.has(goal.ageGroupId)) issue(['skillGoals', i, 'ageGroupId'], 'Onbekende leeftijdsband');
    if (!categories.has(goal.categoryId)) issue(['skillGoals', i, 'categoryId'], 'Onbekende categorie');
    if (goal.skillIds.some(id => !skillIds.has(id))) issue(['skillGoals', i, 'skillIds'], 'Onbekende vaardigheid');
    unique(goal.skillIds, ['skillGoals', i, 'skillIds']);
  });
  model.clubGoals.forEach((goal, i) => {
    if (!ages.has(goal.ageGroupId)) issue(['clubGoals', i, 'ageGroupId'], 'Onbekende leeftijdsband');
    if (goal.skillGoalIds.some(id => !goals.has(id))) issue(['clubGoals', i, 'skillGoalIds'], 'Onbekend vaardigheidsdoel');
    unique(goal.skillGoalIds, ['clubGoals', i, 'skillGoalIds']);
  });
});

export type DevelopmentModel = z.infer<typeof DevelopmentModelSchema>;
