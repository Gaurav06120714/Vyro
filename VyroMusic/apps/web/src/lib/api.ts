// API client — all requests go through Next.js rewrite proxy (/api/*)
// Usage:
//   api('/api/tracks/trending')           → GET
//   api('/api/me/playlists', { method: 'POST', body: ... })  → POST

const BASE = '';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const url = path.startsWith('/api') ? path : `${BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && !path.includes('/auth/refresh')) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const data = await refreshed.json() as { accessToken: string };
      accessToken = data.accessToken;
      const retry = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      if (!retry.ok) throw new Error(`API Error: ${retry.status}`);
      if (retry.status === 204) return undefined as unknown as T;
      return retry.json() as Promise<T>;
    } else {
      accessToken = null;
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error || `API Error: ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Callable api(path, options?) — main usage pattern
export function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options);
}

// Also expose method shortcuts for convenience
api.get = <T = unknown>(path: string) => request<T>(path);
api.post = <T = unknown>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
api.put = <T = unknown>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
api.del = <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' });
