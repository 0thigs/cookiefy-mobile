import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../lib/config';

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
