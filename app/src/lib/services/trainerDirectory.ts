import { trainerAdministrationToken } from '$lib/auth';

export interface DirectoryUser {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string | null;
  otherMails: string[] | null;
}

interface GraphCollection<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

interface AppRole {
  id: string;
  value: string;
  isEnabled: boolean;
  allowedMemberTypes: string[];
}

interface ApiPrincipal {
  id: string;
  appId: string;
  appRoles: AppRole[];
}

interface RoleAssignment {
  resourceId: string;
  appRoleId: string;
}

const graphOrigin = 'https://graph.microsoft.com';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function graphUrl(path: string): URL {
  const url = new URL(path, `${graphOrigin}/v1.0/`);
  if (url.origin !== graphOrigin || !url.pathname.startsWith('/v1.0/') || url.username || url.password) {
    throw new Error('Microsoft Graph gaf een ongeldig vervolgadres terug.');
  }
  return url;
}

async function graphRequest<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(graphUrl(path), {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Microsoft Graph weigert deze actie. Controleer je Entra-beheerrol en de gedelegeerde toestemmingen.');
    }
    throw new Error(`Microsoft Graph kon de actie niet uitvoeren (HTTP ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function collection<T>(token: string, path: string): Promise<T[]> {
  const result: T[] = [];
  const visited = new Set<string>();
  let next: string | undefined = path;
  while (next) {
    const url = graphUrl(next).href;
    if (visited.has(url)) throw new Error('Microsoft Graph gaf een herhaald vervolgadres terug.');
    visited.add(url);
    const page: GraphCollection<T> = await graphRequest(token, url);
    result.push(...page.value);
    next = page['@odata.nextLink'];
  }
  return result;
}

function filterPath(path: string, filter: string, select: string): string {
  const params = new URLSearchParams({ '$filter': filter, '$select': select });
  return `${path}?${params}`;
}

function userId(id: string): string {
  if (!uuid.test(id)) throw new Error('Microsoft Graph gaf een ongeldig gebruikers-ID terug.');
  return id;
}

function normalizedEmail(email: string): string {
  const value = email.trim();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Vul een geldig e-mailadres in.');
  }
  return value;
}

export async function findTrainerByEmail(token: string, input: string): Promise<DirectoryUser | null> {
  const email = normalizedEmail(input);
  const escaped = email.replace(/'/g, "''");
  const select = 'id,displayName,mail,userPrincipalName,otherMails';
  const filters = [`mail eq '${escaped}'`, `userPrincipalName eq '${escaped}'`, `otherMails/any(m:m eq '${escaped}')`];
  const pages = await Promise.all(filters.map(filter => collection<DirectoryUser>(token, filterPath('users', filter, select))));
  const users = new Map(pages.flat().map(user => [userId(user.id).toLowerCase(), user]));
  if (users.size > 1) throw new Error('Dit e-mailadres hoort bij meerdere Entra-gebruikers. Los dit eerst op in Entra.');
  return [...users.values()][0] ?? null;
}

export async function getTrainer(token: string, objectId: string): Promise<DirectoryUser> {
  return graphRequest(token, `users/${userId(objectId)}?$select=id,displayName,mail,userPrincipalName,otherMails`);
}

export async function inviteTrainer(token: string, input: string): Promise<DirectoryUser> {
  const email = normalizedEmail(input);
  const result = await graphRequest<{ invitedUser: { id: string } }>(token, 'invitations', 'POST', {
    invitedUserEmailAddress: email,
    inviteRedirectUrl: `${window.location.origin}/`,
    sendInvitationMessage: true,
  });
  const id = userId(result.invitedUser.id);
  return { id, displayName: null, mail: email, userPrincipalName: null, otherMails: [] };
}

async function ensureAppRole(token: string, objectId: string, roleName: 'Trainer' | 'Committee'): Promise<void> {
  const id = userId(objectId);
  const apiClientId = import.meta.env.VITE_ENTRA_API_CLIENT_ID;
  if (!apiClientId || !uuid.test(apiClientId)) throw new Error('De API-identiteit is niet geconfigureerd.');
  const principals = await collection<ApiPrincipal>(token, filterPath('servicePrincipals', `appId eq '${apiClientId}'`, 'id,appId,appRoles'));
  if (principals.length !== 1 || principals[0].appId.toLowerCase() !== apiClientId.toLowerCase()) {
    throw new Error('De API-serviceprincipal kon niet eenduidig worden gevonden.');
  }
  const principal = principals[0];
  const roles = principal.appRoles.filter(role => role.value === roleName && role.isEnabled && role.allowedMemberTypes.includes('User'));
  if (roles.length !== 1) throw new Error(`De ${roleName}-rol is niet eenduidig ingesteld in Entra.`);
  const resourceId = userId(principal.id);
  const roleId = userId(roles[0].id);
  const assignments = await collection<RoleAssignment>(token, `users/${id}/appRoleAssignments?$select=resourceId,appRoleId`);
  if (assignments.some(item => item.resourceId.toLowerCase() === resourceId.toLowerCase() && item.appRoleId.toLowerCase() === roleId.toLowerCase())) return;
  await graphRequest(token, `servicePrincipals/${resourceId}/appRoleAssignedTo`, 'POST', {
    principalId: id, resourceId, appRoleId: roleId,
  });
}

export function ensureTrainerRole(token: string, objectId: string): Promise<void> {
  return ensureAppRole(token, objectId, 'Trainer');
}

export function ensureCommitteeRole(token: string, objectId: string): Promise<void> {
  return ensureAppRole(token, objectId, 'Committee');
}

export { trainerAdministrationToken };
