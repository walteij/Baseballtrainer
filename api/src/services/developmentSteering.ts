import type { AgeGroupId, TeamSeason } from '../../../shared/types/entities.js';
import { developmentBandsForCategory } from '../../../shared/types/developmentAgeGroups.js';
import type { DevelopmentModel } from '../../../shared/schemas/development.js';
import type { DevelopmentAssignment } from '../../../shared/schemas/developmentAssignment.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { TEAM, find } from './data.js';
import { AppError } from '../errors/AppError.js';
import { NotFoundError } from '../errors/errorTypes.js';
import { DevelopmentService } from './development.js';
import { DevelopmentAssignmentService } from './developmentAssignments.js';

/** Maps development-model taxonomy categories to drill catalog categories; null = no drills exist. */
export const drillCategoryByDevelopmentCategory: Record<string, string | null> = {
  hitting: 'batting',
  pitching: 'pitching',
  catching: 'catching',
  infield: 'infield',
  outfield: 'outfield',
  baserunning: 'baserunning',
  throwing: 'throwing',
  game_awareness: 'situational',
  physical: 'conditioning',
  mental: null,
};

export interface ProgramSteering {
  seasonId: string;
  modelVersion: number;
  assignmentsVersion: number;
  /** Drill catalog category -> best (lowest) assignment priority. */
  priorities: Map<string, number>;
}

export interface TransitionSkillReport {
  id: string;
  name: string;
  category: string;
  previousLevel: string;
  nextLevel: string;
  nextGoal: string;
  covered: boolean;
}

export interface TransitionReport {
  transition: { from: AgeGroupId; to: AgeGroupId } | null;
  modelVersion: number | null;
  skills: TransitionSkillReport[];
}

export class DevelopmentSteeringService {
  private readonly development: DevelopmentService;
  private readonly assignments: DevelopmentAssignmentService;
  constructor(private readonly repo: ICosmosRepository) {
    this.development = new DevelopmentService(repo);
    this.assignments = new DevelopmentAssignmentService(repo);
  }

  private seasons(teamId: string): Promise<TeamSeason[]> {
    return find<TeamSeason>(this.repo, TEAM, 'season', { team_id: teamId }, teamId);
  }

  private coveredSkillIds(model: DevelopmentModel, assignments: DevelopmentAssignment[]): Set<string> {
    const skillGoals = new Map(model.skillGoals.map(goal => [goal.id, goal]));
    const covered = new Set<string>();
    for (const assignment of assignments) {
      if (!assignment.active) continue;
      const goals = assignment.goalType === 'skill_goal'
        ? [skillGoals.get(assignment.goalId)]
        : (model.clubGoals.find(goal => goal.id === assignment.goalId)?.skillGoalIds ?? []).map(id => skillGoals.get(id));
      for (const goal of goals) for (const skillId of goal?.skillIds ?? []) covered.add(skillId);
    }
    return covered;
  }

  private categoryPriorities(model: DevelopmentModel, assignments: DevelopmentAssignment[]): Map<string, number> {
    const skillGoals = new Map(model.skillGoals.map(goal => [goal.id, goal]));
    const priorities = new Map<string, number>();
    const add = (categoryId: string, priority: number) => {
      const drillCategory = drillCategoryByDevelopmentCategory[categoryId];
      if (!drillCategory) return;
      const current = priorities.get(drillCategory);
      if (current === undefined || priority < current) priorities.set(drillCategory, priority);
    };
    for (const assignment of assignments) {
      if (!assignment.active) continue;
      const goals = assignment.goalType === 'skill_goal'
        ? [skillGoals.get(assignment.goalId)]
        : (model.clubGoals.find(goal => goal.id === assignment.goalId)?.skillGoalIds ?? []).map(id => skillGoals.get(id));
      for (const goal of goals) if (goal) add(goal.categoryId, assignment.priority);
    }
    return priorities;
  }

  /**
   * Resolves the active development assignments of the team season matching the
   * program start year into drill-category priorities. Returns null when no
   * season, no saved assignments or no steerable categories exist, so the
   * generator keeps its existing leerlijn behavior.
   */
  async steeringForProgram(teamId: string, startDate: string): Promise<ProgramSteering | null> {
    const year = Number(startDate.slice(0, 4));
    const season = (await this.seasons(teamId)).find(item => item.year === year);
    if (!season) return null;
    const saved = await this.assignments.get(teamId, season.id);
    if (!saved || !saved.assignments.some(item => item.active)) return null;
    const model = await this.development.get(saved.modelVersion);
    if (!model) throw new AppError('MISSING_DEVELOPMENT_MODEL', 'De opgeslagen versie van de ontwikkelleerlijn ontbreekt', 422);
    const priorities = this.categoryPriorities(model.model, saved.assignments);
    if (priorities.size === 0) return null;
    return { seasonId: season.id, modelVersion: saved.modelVersion, assignmentsVersion: saved.version, priorities };
  }

  /**
   * Reports, for a season whose age group differs from the team's previous
   * season, which development-model skills carry over to the new age group and
   * whether the season's active development goals cover them.
   */
  async transitionCheck(teamId: string, seasonId: string): Promise<TransitionReport> {
    const seasons = await this.seasons(teamId);
    const season = seasons.find(item => item.id === seasonId);
    if (!season) throw new NotFoundError('Season', seasonId);
    const previous = seasons.filter(item => item.year < season.year).sort((a, b) => b.year - a.year)[0];
    if (!previous || previous.age_group_id === season.age_group_id) return { transition: null, modelVersion: null, skills: [] };
    const transition = { from: previous.age_group_id, to: season.age_group_id };
    const saved = await this.assignments.get(teamId, seasonId);
    const model = saved ? await this.development.get(saved.modelVersion) : await this.development.get();
    if (!model) return { transition, modelVersion: null, skills: [] };
    const fromBands = new Set(developmentBandsForCategory(previous.age_group_id, model.model.ageGroups).map(band => band.id));
    const toBands = new Set(developmentBandsForCategory(season.age_group_id, model.model.ageGroups).map(band => band.id));
    const bandAge = new Map(model.model.ageGroups.map(band => [band.id, band.minAge]));
    const covered = this.coveredSkillIds(model.model, saved?.assignments ?? []);
    const highest = <T extends { ageGroupId: string }>(items: T[]) =>
      items.reduce((a, b) => ((bandAge.get(a.ageGroupId) ?? 0) >= (bandAge.get(b.ageGroupId) ?? 0) ? a : b));
    const skills: TransitionSkillReport[] = [];
    for (const category of model.model.taxonomy) {
      for (const skill of category.skills) {
        if (!skill.active) continue;
        const fromProgressions = skill.ageProgressions.filter(item => fromBands.has(item.ageGroupId));
        const toProgressions = skill.ageProgressions.filter(item => toBands.has(item.ageGroupId));
        if (fromProgressions.length === 0 || toProgressions.length === 0) continue;
        const next = highest(toProgressions);
        skills.push({
          id: skill.id,
          name: skill.name.nl,
          category: category.id,
          previousLevel: highest(fromProgressions).level,
          nextLevel: next.level,
          nextGoal: next.goal.nl,
          covered: covered.has(skill.id),
        });
      }
    }
    return { transition, modelVersion: model.version, skills };
  }
}
