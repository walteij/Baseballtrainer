import { DevelopmentModelSchema } from '../../shared/schemas/development.js';

export function developmentFixture() {
  const ageGroups = [
    { id: 'age_6_8', name: '6-8 jaar', minAge: 6, maxAge: 8, active: true, sortOrder: 1 },
    { id: 'age_9_10', name: '9-10 jaar', minAge: 9, maxAge: 10, active: true, sortOrder: 2 },
    { id: 'age_11_12', name: '11-12 jaar', minAge: 11, maxAge: 12, active: true, sortOrder: 3 },
    { id: 'age_13_15', name: '13-15 jaar', minAge: 13, maxAge: 15, active: true, sortOrder: 4 },
    { id: 'age_16_plus', name: '16+ jaar', minAge: 16, maxAge: null, active: true, sortOrder: 5 },
  ];
  const criterion = { id: 'mc_fixture', description: { nl: 'Oefen' }, measurementType: 'observation', target: { required: true }, evidence: ['coach_observation'] };
  const makeSkill = (id: string) => ({
    id, name: { nl: 'Vaardigheid' }, description: { nl: 'Beschrijving' }, active: true,
    ageProgressions: [{ id: `prog_${id}`, ageGroupId: ageGroups[0].id, level: 'foundation', goal: { nl: 'Leren' }, masteryCriteria: [criterion], editable: true }],
  });
  const taxonomy = ['hitting', 'pitching', 'catching', 'infield', 'outfield', 'baserunning', 'throwing', 'game_awareness', 'physical', 'mental']
    .map((id, sortOrder) => ({
      id, name: id, sortOrder, skills: sortOrder === 0 ? [makeSkill('hit_fixture')] : sortOrder === 1 ? [makeSkill('pitch_fixture')] : [],
    }));
  const skillGoals = ageGroups.map(age => ({
    id: `sg_${age.id}`, name: { nl: `Doel ${age.name}` }, description: { nl: 'Beschrijving' },
    categoryId: 'hitting', ageGroupId: age.id, skillIds: ['hit_fixture'], masteryCriteria: [criterion],
    status: 'draft', editable: true,
  }));
  const clubGoals = [{
    id: 'cg_fixture', name: { nl: 'Clubdoel' }, description: { nl: 'Beschrijving' },
    ageGroupId: ageGroups[0].id, skillGoalIds: [skillGoals[0].id],
    successMetrics: [{ id: 'metric_fixture', metric: 'coach_review_completed', target: 100, reviewFrequency: 'end_of_season' }],
    priority: 1, status: 'draft', editable: true,
  }];
  return DevelopmentModelSchema.parse({ schemaVersion: '1.0.0', ageGroups, taxonomy, skillGoals, clubGoals });
}
