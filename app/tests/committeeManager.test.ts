// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const mocks = vi.hoisted(() => ({
  findTrainerByEmail: vi.fn(),
  inviteTrainer: vi.fn(),
  ensureCommitteeRole: vi.fn(),
  trainerAdministrationToken: vi.fn(),
}));
vi.mock('$lib/services/trainerDirectory', () => mocks);
import CommitteeManager from '../src/lib/components/CommitteeManager.svelte';

const user = { id: 'existing-id', displayName: 'Trainer', mail: 'trainer@example.test', userPrincipalName: null, otherMails: [] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.trainerAdministrationToken.mockResolvedValue('token');
});
afterEach(cleanup);

async function search() {
  await fireEvent.input(screen.getByLabelText('E-mailadres TC-lid'), { target: { value: 'trainer@example.test' } });
  await fireEvent.click(screen.getByText('Zoek TC-lid'));
}

describe('committee management', () => {
  it('assigns an existing trainer after confirmation without inviting again', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(user);
    render(CommitteeManager);
    await search();
    await screen.findByText('Ken TC-rol toe');
    expect(mocks.ensureCommitteeRole).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText('Ken TC-rol toe'));
    await screen.findByText(/TC-rol is toegekend/);
    expect(mocks.ensureCommitteeRole).toHaveBeenCalledWith('token', user.id);
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
  });

  it('invites a new guest only after confirmation', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(null);
    mocks.inviteTrainer.mockResolvedValue(user);
    render(CommitteeManager);
    await search();
    await screen.findByText('Nodig gast uit en ken TC-rol toe');
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText('Nodig gast uit en ken TC-rol toe'));
    await screen.findByText(/uitnodiging geaccepteerd/);
    expect(mocks.ensureCommitteeRole).toHaveBeenCalledWith('token', user.id);
  });

  it('does not invite if the directory changed after search', async () => {
    mocks.findTrainerByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    render(CommitteeManager);
    await search();
    await screen.findByText('Nodig gast uit en ken TC-rol toe');
    await fireEvent.click(screen.getByText('Nodig gast uit en ken TC-rol toe'));
    await screen.findByText(/inmiddels een bestaande gebruiker gevonden/);
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
    expect(mocks.ensureCommitteeRole).not.toHaveBeenCalled();
  });

  it('reports an incomplete role assignment after invitation', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(null);
    mocks.inviteTrainer.mockResolvedValue(user);
    mocks.ensureCommitteeRole.mockRejectedValue(new Error('Graph niet bereikbaar'));
    render(CommitteeManager);
    await search();
    await screen.findByText('Nodig gast uit en ken TC-rol toe');
    await fireEvent.click(screen.getByText('Nodig gast uit en ken TC-rol toe'));
    await screen.findByText(/gebruiker kan al zijn uitgenodigd, maar de TC-rol is niet bevestigd/);
  });
});
