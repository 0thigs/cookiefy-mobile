import { clearSession, getAccessToken, setAccessToken } from '../hooks/auth-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://cookiefy-server.onrender.com';

async function core(path: string, init: RequestInit & { _retry?: boolean } = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !init._retry) {
    const ok = await refresh();
    if (ok) return core(path, { ...init, _retry: true });
    await clearSession();
  }

  if (!res.ok) {
    const msg = await readMessage(res);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

async function refresh() {
  try {
    const r = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) return false;
    const data = (await r.json()) as { token: string; expiresIn: string | number };
    await setAccessToken(data.token);
    return true;
  } catch {
    return false;
  }
}

async function readMessage(res: Response) {
  try {
    const j = await res.json();
    return j?.message || j?.error || '';
  } catch {
    return '';
  }
}

export const http = {
  get<T = any>(path: string, init?: RequestInit) {
    return core(path, { ...init, method: 'GET' }) as Promise<T>;
  },
  post<T = any>(path: string, body?: unknown, init?: RequestInit) {
    const headers = new Headers(init?.headers || {});
    const hasBody = body !== undefined && body !== null;
    if (hasBody) headers.set('Content-Type', 'application/json');
    else headers.delete('Content-Type'); 

    return core(path, {
      ...init,
      method: 'POST',
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    }) as Promise<T>;
  },
  patch<T = any>(path: string, body?: unknown, init?: RequestInit) {
    const headers = new Headers(init?.headers || {});
    headers.set('Content-Type', 'application/json');
    return core(path, {
      ...init,
      method: 'PATCH',
      headers,
      body: JSON.stringify(body ?? {}),
    }) as Promise<T>;
  },
  put<T = any>(path: string, body?: unknown, init?: RequestInit) {
    const headers = new Headers(init?.headers || {});
    headers.set('Content-Type', 'application/json');
    return core(path, {
      ...init,
      method: 'PUT',
      headers,
      body: JSON.stringify(body ?? {}),
    }) as Promise<T>;
  },
  delete<T = any>(path: string, init?: RequestInit) {
    return core(path, { ...init, method: 'DELETE' }) as Promise<T>;
  },
};
