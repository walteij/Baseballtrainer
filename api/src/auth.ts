import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { HttpRequest } from '@azure/functions';
import { AppError } from './errors/AppError.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keySets = new Map<string, JWTVerifyGetKey>();

export interface AuthenticatedUser {
  objectId: string;
  isCommittee: boolean;
}

export function requireCommittee(user: AuthenticatedUser): void {
  if (!user.isCommittee) throw new AppError('FORBIDDEN', 'Committee access is required', 403);
}

function unauthorized(): AppError {
  return new AppError('UNAUTHORIZED', 'A valid access token is required', 401);
}

export async function authorizeRequest(
  request: HttpRequest,
  env: NodeJS.ProcessEnv = process.env,
  testKeySet?: JWTVerifyGetKey,
): Promise<AuthenticatedUser> {
  const tenantId = env.ENTRA_TENANT_ID?.trim().toLowerCase();
  const apiClientId = env.ENTRA_API_CLIENT_ID?.trim().toLowerCase();
  if (!tenantId || !uuid.test(tenantId) || !apiClientId || !uuid.test(apiClientId)) {
    throw new AppError('SERVICE_UNAVAILABLE', 'Authentication is not configured', 503);
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw unauthorized();

  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  let keySet = testKeySet ?? keySets.get(tenantId);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
    keySets.set(tenantId, keySet);
  }

  try {
    const { payload } = await jwtVerify(match[1], keySet, {
      algorithms: ['RS256'],
      issuer,
      audience: apiClientId,
      requiredClaims: ['exp', 'iat', 'oid', 'tid', 'scp'],
    });
    if (payload.tid !== tenantId || typeof payload.oid !== 'string' || !uuid.test(payload.oid) ||
        typeof payload.scp !== 'string' || !payload.scp.split(' ').includes('access_as_user') ||
        !Array.isArray(payload.roles) || (!payload.roles.includes('Trainer') && !payload.roles.includes('Committee'))) {
      throw new AppError('FORBIDDEN', 'This account does not have access to the application', 403);
    }
    return { objectId: payload.oid.toLowerCase(), isCommittee: payload.roles.includes('Committee') };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof errors.JWKSTimeout) {
      throw new AppError('SERVICE_UNAVAILABLE', 'Authentication service is unavailable', 503);
    }
    if (error instanceof errors.JOSEError) throw unauthorized();
    throw error;
  }
}
