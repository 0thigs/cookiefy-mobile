import { makeRedirectUri } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('A variável EXPO_PUBLIC_API_URL não foi definida no .env');
}

WebBrowser.maybeCompleteAuthSession();

const ACCESS_TOKEN_KEY = 'cookiefy_access_token';
let inMemoryToken: string | null = null;

type SessionExpiredListener = () => void;
const sessionExpiredListeners: SessionExpiredListener[] = [];

export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.push(listener);
  return () => {
    const idx = sessionExpiredListeners.indexOf(listener);
    if (idx >= 0) sessionExpiredListeners.splice(idx, 1);
  };
}

export async function getAccessToken() {
  if (inMemoryToken !== null) return inMemoryToken;
  const v = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  inMemoryToken = v ?? null;
  return inMemoryToken;
}
export async function setAccessToken(token: string) {
  inMemoryToken = token;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}
export async function clearSession() {
  inMemoryToken = null;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  sessionExpiredListeners.forEach((l) => l());
}

export async function signInWithGoogle() {
  const redirectUrl = makeRedirectUri({
    path: '/auth/callback',
  });

  console.log(redirectUrl)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error(i18n.t('auth.oauthStartError'));

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    // Tenta pegar do fragmento (#) ou da query (?)
    let params = new URLSearchParams(result.url.split('#')[1]);
    if (!params.get('access_token')) {
      // Fallback para query params se não achar no fragmento
      const queryPart = result.url.split('?')[1];
      if (queryPart) {
        params = new URLSearchParams(queryPart);
      }
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) throw new Error(i18n.t('auth.tokenNotFound'));

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken!,
    });

    if (sessionError) throw new Error(sessionError.message);

    const res = await fetch(`${API_BASE_URL}/auth/exchange/supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: sessionData.session?.access_token }),
    });

    if (!res.ok) {
      await supabase.auth.signOut();
      const msg = await res.json().catch(() => ({}));
      throw new Error(msg?.message ?? i18n.t('auth.tokenExchangeError'));
    }

    const serverData = (await res.json()) as { token: string; expiresIn: string | number };
    
    if (!serverData.token) {
      throw new Error(i18n.t('auth.serverTokenMissing'));
    }

    await setAccessToken(serverData.token);

    await supabase.auth.signOut();
  } else {
    throw new Error(i18n.t('auth.loginCancelled'));
  }
}

export type Me = { 
  id: string; 
  email: string; 
  name: string; 
  photoUrl: string | null; 
  role: 'USER' | 'ADMIN'; 
} | null;

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.message ?? i18n.t('auth.invalidCredentials'));
  }
  const data = (await res.json()) as { token: string; expiresIn: string | number };
  await setAccessToken(data.token);
}

export async function signUp(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.message ?? i18n.t('auth.registerError'));
  }
  await signIn(email, password);
}

export async function signOut() {
  await fetch(`${API_BASE_URL}/auth/signout`, { method: 'POST', credentials: 'include' });
  await clearSession();
}

export async function fetchMe(): Promise<Me> {
  const token = await getAccessToken();
  
  if (!token) return null;

  const meRes = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  
  if (!meRes.ok) {
    return null;
  }
  
  const me = await meRes.json();
  return { 
    id: me.id, 
    email: me.email, 
    name: me.name, 
    photoUrl: me.photoUrl ?? null,
    role: me.role 
  };
}
