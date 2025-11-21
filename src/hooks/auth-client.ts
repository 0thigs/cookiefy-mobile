import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// URL base vinda do .env ou fallback
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3333';

// Adicionar handler do WebBrowser
WebBrowser.maybeCompleteAuthSession();

const ACCESS_TOKEN_KEY = 'cookiefy_access_token';
let inMemoryToken: string | null = null;

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
}

// Nova função de login Google
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
  if (!data?.url) throw new Error('Falha ao iniciar autenticação OAuth');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    // Extrair tokens da URL de retorno (fragment hash)
    const params = new URLSearchParams(result.url.split('#')[1]);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) throw new Error('Token não encontrado na resposta');

    // Setar sessão no cliente Supabase para pegar metadados se necessário
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken!,
    });

    if (sessionError) throw new Error(sessionError.message);

    // Troca de Token com o SEU Backend
    const res = await fetch(`${API_BASE_URL}/auth/exchange/supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include', // Importante para receber o cookie httpOnly
      body: JSON.stringify({ token: sessionData.session?.access_token }),
    });

    if (!res.ok) {
      await supabase.auth.signOut();
      const msg = await res.json().catch(() => ({}));
      throw new Error(msg?.message ?? 'Falha na troca de token com o servidor');
    }

    const serverData = (await res.json()) as { token: string; expiresIn: string | number };
    await setAccessToken(serverData.token);

    // Limpa sessão do Supabase pois já temos o token do nosso back
    await supabase.auth.signOut();
  } else {
    throw new Error('Login cancelado pelo usuário');
  }
}

export type Me = { id: string; email: string; name: string; photoUrl: string | null } | null;

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.message ?? 'Credenciais inválidas');
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
    throw new Error(msg?.message ?? 'Falha no registro');
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
  if (!meRes.ok) return null;
  const me = await meRes.json();
  return { id: me.id, email: me.email, name: me.name, photoUrl: me.photoUrl ?? null };
}
