// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';

const mocks = vi.hoisted(() => ({
  findTrainerByEmail: vi.fn(),
  getTrainer: vi.fn(),
  inviteTrainer: vi.fn(),
  ensureTrainerRole: vi.fn(),
  trainerAdministrationToken: vi.fn(),
  assignTrainer: vi.fn(),
  unassignTrainer: vi.fn(),
  listAssignments: vi.fn(),
}));
vi.mock('$lib/services/trainerDirectory', () => mocks);
vi.mock('$lib/api', () => ({ api: mocks }));
import TrainerManager from '../src/lib/components/TrainerManager.svelte';

const user = { id: 'trainer-id', displayName: 'Piet Trainer', mail: 'piet@example.test', otherMails: [], userPrincipalName: null };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.trainerAdministrationToken.mockResolvedValue('token');
  mocks.listAssignments.mockResolvedValue([{ objectId: user.id }]);
});
afterEach(cleanup);

async function find() {
  await fireEvent.input(screen.getByLabelText('E-mailadres trainer'), { target: { value: 'piet@example.test' } });
  await fireEvent.click(screen.getByText('Zoek trainer'));
}

describe('trainer management', () => {
  it('asks for confirmation before inviting and then assigns the role and team', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(null);
    mocks.inviteTrainer.mockResolvedValue(user);
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [] });
    await find();
    await screen.findByText('Nodig gast uit en koppel');
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText('Nodig gast uit en koppel'));
    await screen.findByText(/Entra heeft de uitnodiging geaccepteerd/);
    expect(mocks.ensureTrainerRole).toHaveBeenCalledWith('token', user.id);
    expect(mocks.assignTrainer).toHaveBeenCalledWith('team-a', user.id);
  });

  it('uses an existing account without sending a new invitation', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(user);
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [] });
    await find();
    await screen.findByText('Koppel bestaande gebruiker');
    await fireEvent.click(screen.getByText('Koppel bestaande gebruiker'));
    await screen.findByText(/De bestaande gebruiker heeft/);
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
  });

  it('reports partial failure if the team assignment fails after the role was granted', async () => {
    mocks.findTrainerByEmail.mockResolvedValue(user);
    mocks.assignTrainer.mockRejectedValue(new Error('API niet bereikbaar'));
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [] });
    await find();
    await screen.findByText('Koppel bestaande gebruiker');
    await fireEvent.click(screen.getByText('Koppel bestaande gebruiker'));
    await screen.findByText(/teamkoppeling kon niet worden bevestigd/);
    expect(mocks.ensureTrainerRole).toHaveBeenCalledOnce();
  });

  it('does not invite if the directory changed after search', async () => {
    mocks.findTrainerByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [] });
    await find();
    await screen.findByText('Nodig gast uit en koppel');
    await fireEvent.click(screen.getByText('Nodig gast uit en koppel'));
    await screen.findByText(/inmiddels een bestaande gebruiker gevonden/);
    expect(mocks.inviteTrainer).not.toHaveBeenCalled();
  });

  it('removes only the team assignment and keeps the Entra user and role', async () => {
    mocks.listAssignments.mockResolvedValue([]);
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [{ objectId: user.id }] });
    await fireEvent.click(screen.getByText('Verwijderen'));
    await waitFor(() => expect(mocks.unassignTrainer).toHaveBeenCalledWith('team-a', user.id));
    await screen.findByText(/Entra-gebruiker en Trainer-rol blijven bestaan/);
  });

  it('distinguishes removal from a later refresh failure', async () => {
    mocks.listAssignments.mockRejectedValue(new Error('API niet bereikbaar'));
    render(TrainerManager, { teamId: 'team-a', teamName: 'U12', assignments: [{ objectId: user.id }] });
    await fireEvent.click(screen.getByText('Verwijderen'));
    await screen.findByText(/trainerkoppeling is verwijderd, maar de lijst kon niet worden ververst/);
  });
});
