import { AppError } from '../errors/AppError.js';
import { NotFoundError } from '../errors/errorTypes.js';
import type { AuthenticatedUser } from '../auth.js';
import type { ICosmosRepository } from './interfaces/ICosmosRepository.js';
import { TEAM, find } from './data.js';

export interface TeamAssignment {
  id: string;
  team_id: string;
  object_id: string;
  kind: 'trainer-assignment';
}

export class TeamAccessService {
  constructor(private readonly repo: ICosmosRepository) {}

  async requireGoalWrite(user: AuthenticatedUser, teamId: string): Promise<void> {
    if (user.isCommittee) return;
    const assignment = await this.repo.getById<TeamAssignment>(TEAM, `trainer-${user.objectId}`, teamId);
    if (!assignment || assignment.kind !== 'trainer-assignment' || assignment.team_id !== teamId || assignment.object_id !== user.objectId) {
      throw new AppError('FORBIDDEN', 'You are not assigned to this team', 403);
    }
  }

  async list(teamId: string): Promise<{ objectId: string }[]> {
    await this.requireTeam(teamId);
    const assignments = await find<TeamAssignment>(this.repo, TEAM, 'trainer-assignment', {}, teamId);
    return assignments.map(({ object_id }) => ({ objectId: object_id }));
  }

  async assign(teamId: string, objectId: string): Promise<void> {
    await this.requireTeam(teamId);
    const id = objectId.toLowerCase();
    await this.repo.upsert(TEAM, { id: `trainer-${id}`, team_id: teamId, object_id: id, kind: 'trainer-assignment' });
  }

  async unassign(teamId: string, objectId: string): Promise<void> {
    await this.requireTeam(teamId);
    await this.repo.delete(TEAM, `trainer-${objectId.toLowerCase()}`, teamId);
  }

  private async requireTeam(teamId: string): Promise<void> {
    const team = await this.repo.getById<{ kind?: string }>(TEAM, teamId, teamId);
    if (!team || team.kind !== 'team') throw new NotFoundError('Team', teamId);
  }
}
