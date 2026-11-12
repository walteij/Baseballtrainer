import { beforeAll, describe, expect, it } from 'vitest';
import { HttpRequest } from '@azure/functions';
import { generateKeyPair, SignJWT, type JWTVerifyGetKey, type KeyLike } from 'jose';
import { authorizeRequest } from '../src/auth.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const clientId = '427b294b-0915-4262-9380-099377e9e84b';
const userId = '54e9a1de-1a80-4871-a1d4-0e163776ef3b';
const env = { ENTRA_TENANT_ID: tenantId, ENTRA_API_CLIENT_ID: clientId };
let privateKey: KeyLike;
let verifyKey: JWTVerifyGetKey;

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  verifyKey = async () => keys.publicKey;
});

async function token(overrides: Record<string, unknown> = {}, audience = clientId, issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`) {
  return new SignJWT({ tid: tenantId, oid: userId, scp: 'access_as_user', roles: ['Trainer'], ...overrides })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(issuer).setAudience(audience)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
}

function request(value?: string) {
  return new HttpRequest({ method: 'GET', url: 'https://example.test/api/teams', headers: value ? { authorization: value } : {} });
}

describe('Entra API authorization', () => {
  it('accepts a signed delegated token for an assigned trainer', async () => {
    await expect(authorizeRequest(request(`Bearer ${await token()}`), env, verifyKey)).resolves.toEqual({ objectId: userId, isCommittee: false });
    await expect(authorizeRequest(request(`Bearer ${await token({ roles: ['Committee'] })}`), env, verifyKey)).resolves.toEqual({ objectId: userId, isCommittee: true });
  });
  it('fails closed when configuration or token is missing', async () => {
    await expect(authorizeRequest(request(), {}, verifyKey)).rejects.toMatchObject({ status: 503 });
    await expect(authorizeRequest(request(), env, verifyKey)).rejects.toMatchObject({ status: 401 });
    await expect(authorizeRequest(request('Bearer invalid'), env, verifyKey)).rejects.toMatchObject({ status: 401 });
  });
  it('rejects tokens for another API or tenant and expired tokens', async () => {
    const wrongAudience = await token({}, 'other-api');
    const wrongIssuer = await token({}, clientId, 'https://login.microsoftonline.com/other/v2.0');
    const expired = await new SignJWT({ tid: tenantId, oid: userId, scp: 'access_as_user', roles: ['Trainer'] })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(`https://login.microsoftonline.com/${tenantId}/v2.0`)
      .setAudience(clientId).setIssuedAt().setExpirationTime('1 second ago').sign(privateKey);
    for (const value of [wrongAudience, wrongIssuer, expired]) {
      await expect(authorizeRequest(request(`Bearer ${value}`), env, verifyKey)).rejects.toMatchObject({ status: 401 });
    }
  });
  it('rejects unassigned users and tokens without the delegated API scope', async () => {
    for (const claims of [{ roles: [] }, { scp: 'other_scope' }, { tid: 'other-tenant' }]) {
      await expect(authorizeRequest(request(`Bearer ${await token(claims)}`), env, verifyKey)).rejects.toMatchObject({ status: 403 });
    }
    const idToken = await token({ scp: undefined });
    await expect(authorizeRequest(request(`Bearer ${idToken}`), env, verifyKey)).rejects.toMatchObject({ status: 401 });
  });
  it('rejects a token signed with a different key', async () => {
    const other = await generateKeyPair('RS256');
    const value = await new SignJWT({ tid: tenantId, oid: userId, scp: 'access_as_user', roles: ['Trainer'] })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(`https://login.microsoftonline.com/${tenantId}/v2.0`)
      .setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(other.privateKey);
    await expect(authorizeRequest(request(`Bearer ${value}`), env, verifyKey)).rejects.toMatchObject({ status: 401 });
  });
});
