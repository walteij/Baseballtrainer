import { describe, expect, it } from 'vitest';
import { TeamAccessService } from '../src/services/teamAccess.js';
import { TEAM } from '../src/services/data.js';
import { MemoryRepository } from './memory.js';

const teamA = 'c3eb3c95-a2f4-4a2d-b1ef-428e1af23421';
const teamB = 'ead8b42d-3e43-49b1-8204-ea1c88947490';
const objectId = '54e9a1de-1a80-4871-a1d4-0e163776ef3b';
const trainer = { objectId, isCommittee: false };
const committee = { objectId, isCommittee: true };

describe('team goal permissions', () => {
  it('permits only assigned trainers or committee members and supports revocation', async () => {
    const repo = new MemoryRepository({ [TEAM]: [
      { id: teamA, team_id: teamA, kind: 'team' },
      { id: teamB, team_id: teamB, kind: 'team' },
    ] });
    const access = new TeamAccessService(repo);
    await expect(access.requireGoalWrite(trainer, teamA)).rejects.toMatchObject({ status: 403 });
    await access.assign(teamA, objectId.toUpperCase());
    await expect(access.requireGoalWrite(trainer, teamA)).resolves.toBeUndefined();
    await expect(access.requireGoalWrite(trainer, teamB)).rejects.toMatchObject({ status: 403 });
    await expect(access.requireGoalWrite(committee, teamB)).resolves.toBeUndefined();
    await expect(access.list(teamA)).resolves.toEqual([{ objectId }]);
    await expect(access.list(teamB)).resolves.toEqual([]);
    await access.unassign(teamA, objectId);
    await expect(access.requireGoalWrite(trainer, teamA)).rejects.toMatchObject({ status: 403 });
    await expect(access.assign('missing', objectId)).rejects.toMatchObject({ status: 404 });
  });
  it('does not trust a malformed assignment record', async () => {
    const repo = new MemoryRepository({ [TEAM]: [{ id: `trainer-${objectId}`, team_id: teamA, object_id: objectId, kind: 'team' }] });
    await expect(new TeamAccessService(repo).requireGoalWrite(trainer, teamA)).rejects.toMatchObject({ status: 403 });
  });
});
