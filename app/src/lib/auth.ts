import { BrowserCacheLocation, InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { writable } from 'svelte/store';

export interface Identity { objectId: string; isCommittee: boolean }
export const identity = writable<Identity | null>(null);

let client: PublicClientApplication | undefined;
let account: AccountInfo | undefined;

function config() {
  const tenant = import.meta.env.VITE_ENTRA_TENANT_ID;
  const clientId = import.meta.env.VITE_ENTRA_PWA_CLIENT_ID;
  const apiId = import.meta.env.VITE_ENTRA_API_CLIENT_ID;
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guid.test(tenant ?? '') || !guid.test(clientId ?? '') || !guid.test(apiId ?? '')) {
    throw new Error('Microsoft-aanmelding is niet geconfigureerd.');
  }
  return { tenant, clientId, scope: `api://${apiId}/access_as_user` };
}

export async function initializeAuth(): Promise<boolean> {
  const { tenant, clientId } = config();
  client = new PublicClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenant}`, redirectUri: window.location.origin + '/' },
    cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
  });
  await client.initialize();
  const result = await client.handleRedirectPromise();
  account = result?.account ?? client.getActiveAccount() ?? client.getAllAccounts()[0];
  if (account) client.setActiveAccount(account);
  return !!account;
}

export async function signIn(): Promise<void> {
  if (!client) throw new Error('Microsoft-aanmelding is niet geïnitialiseerd.');
  await client.loginRedirect({ scopes: [config().scope] });
}

export async function accessToken(): Promise<string> {
  if (!client || !account) throw new Error('Meld je eerst aan met je Microsoft-account.');
  try {
    const result = await client.acquireTokenSilent({ account, scopes: [config().scope] });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await client.acquireTokenRedirect({ account, scopes: [config().scope] });
      throw new Error('Aanmelding wordt vernieuwd.');
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  if (!client || !account) throw new Error('Er is geen aangemeld account.');
  identity.set(null);
  await client.logoutRedirect({ account, postLogoutRedirectUri: window.location.origin + '/' });
}
