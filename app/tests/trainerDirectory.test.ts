import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/auth', () => ({ trainerAdministrationToken: vi.fn() }));
import { ensureCommitteeRole, ensureTrainerRole, findTrainerByEmail, inviteTrainer } from '../src/lib/services/trainerDirectory';

const userId = '54e9a1de-1a80-4871-a1d4-0e163776ef3b';
const principalId = 'bbff2fde-8513-412c-91a5-1d71c29e6ffa';
const roleId = '0f603e2a-8065-4208-95ea-46ca2735a42b';
const committeeRoleId = '21e474cf-42ae-4eee-a762-bd6f1035a42b';
const apiId = '351ed333-dbf1-4136-95d3-743cf3d90cb5';
const user = { id: userId, displayName: 'Trainer', mail: 'trainer@example.test', userPrincipalName: null, otherMails: [] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('trainer directory', () => {
  it('finds and deduplicates users across email fields and escapes OData quotes', async () => {
    const fetch = vi.fn().mockImplementation(async () => json({ value: [user] }));
    vi.stubGlobal('fetch', fetch);
    await expect(findTrainerByEmail('token', "o'brien@example.test")).resolves.toEqual(user);
    expect(fetch).toHaveBeenCalledTimes(3);
    const filters = fetch.mock.calls.map(([url]) => (url as URL).searchParams.get('$filter'));
    expect(filters).toContain("mail eq 'o''brien@example.test'");
    expect(filters).toContain("otherMails/any(m:m eq 'o''brien@example.test')");
  });

  it('refuses ambiguous matches and malformed email addresses', async () => {
    const second = { ...user, id: 'ead8b42d-3e43-49b1-8204-ea1c88947490' };
    const fetch = vi.fn().mockImplementation(async () => json({ value: [user, second] }));
    vi.stubGlobal('fetch', fetch);
    await expect(findTrainerByEmail('token', 'trainer@example.test')).rejects.toThrow('meerdere');
    await expect(findTrainerByEmail('token', 'invalid')).rejects.toThrow('geldig e-mailadres');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('uses the invitation result identity and sends the invitation email', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
    const fetch = vi.fn().mockResolvedValue(json({ invitedUser: { id: userId } }, 201));
    vi.stubGlobal('fetch', fetch);
    await expect(inviteTrainer('token', 'trainer@example.test')).resolves.toMatchObject({ id: userId, mail: 'trainer@example.test' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      invitedUserEmailAddress: 'trainer@example.test',
      inviteRedirectUrl: 'https://example.test/',
      sendInvitationMessage: true,
    });
  });

  it('does not duplicate a Trainer role on a later assignment page', async () => {
    vi.stubEnv('VITE_ENTRA_API_CLIENT_ID', apiId);
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ value: [{ id: principalId, appId: apiId, appRoles: [{ id: roleId, value: 'Trainer', isEnabled: true, allowedMemberTypes: ['User'] }] }] }))
      .mockResolvedValueOnce(json({ value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next' }))
      .mockResolvedValueOnce(json({ value: [{ resourceId: principalId, appRoleId: roleId }] }));
    vi.stubGlobal('fetch', fetch);
    await ensureTrainerRole('token', userId);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('assigns the discovered Trainer role when it is absent', async () => {
    vi.stubEnv('VITE_ENTRA_API_CLIENT_ID', apiId);
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ value: [{ id: principalId, appId: apiId, appRoles: [{ id: roleId, value: 'Trainer', isEnabled: true, allowedMemberTypes: ['User'] }] }] }))
      .mockResolvedValueOnce(json({ value: [] }))
      .mockResolvedValueOnce(json({}, 201));
    vi.stubGlobal('fetch', fetch);
    await ensureTrainerRole('token', userId);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ principalId: userId, resourceId: principalId, appRoleId: roleId });
  });

  it('adds Committee without changing an existing Trainer assignment', async () => {
    vi.stubEnv('VITE_ENTRA_API_CLIENT_ID', apiId);
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ value: [{ id: principalId, appId: apiId, appRoles: [
        { id: roleId, value: 'Trainer', isEnabled: true, allowedMemberTypes: ['User'] },
        { id: committeeRoleId, value: 'Committee', isEnabled: true, allowedMemberTypes: ['User'] },
      ] }] }))
      .mockResolvedValueOnce(json({ value: [{ resourceId: principalId, appRoleId: roleId }] }))
      .mockResolvedValueOnce(json({}, 201));
    vi.stubGlobal('fetch', fetch);
    await ensureCommitteeRole('token', userId);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ principalId: userId, resourceId: principalId, appRoleId: committeeRoleId });
    expect(fetch.mock.calls[2][1].method).toBe('POST');
  });

  it('leaves an existing Committee role unchanged', async () => {
    vi.stubEnv('VITE_ENTRA_API_CLIENT_ID', apiId);
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ value: [{ id: principalId, appId: apiId, appRoles: [
        { id: committeeRoleId, value: 'Committee', isEnabled: true, allowedMemberTypes: ['User'] },
      ] }] }))
      .mockResolvedValueOnce(json({ value: [{ resourceId: principalId, appRoleId: committeeRoleId }] }));
    vi.stubGlobal('fetch', fetch);
    await ensureCommitteeRole('token', userId);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects external pagination links without leaking the token', async () => {
    const fetch = vi.fn().mockImplementation(async () => json({ value: [], '@odata.nextLink': 'https://evil.example/next' }));
    vi.stubGlobal('fetch', fetch);
    await expect(findTrainerByEmail('token', 'trainer@example.test')).rejects.toThrow('ongeldig vervolgadres');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('surfaces permission failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 403)));
    await expect(findTrainerByEmail('token', 'trainer@example.test')).rejects.toThrow('Entra-beheerrol');
  });
});
