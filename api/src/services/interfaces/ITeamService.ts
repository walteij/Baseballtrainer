import type {
  AgeGroupId,
  Team,
  TeamSeason,
} from '../../../../shared/types/entities.js';

export interface ITeamService {
  listTeams(): Promise<Team[]>;
  listSeasons(teamId: string): Promise<TeamSeason[]>;
  createTeam(input: { name: string; age_group_id: AgeGroupId }): Promise<Team>;
  updateTeam(id: string, input: { name?: string; age_group_id?: AgeGroupId }): Promise<Team | null>;
  createSeason(
    teamId: string,
    input: { year: number; age_group_id: AgeGroupId; name?: string },
  ): Promise<TeamSeason>;
  healthCheck(): Promise<boolean>;
}
