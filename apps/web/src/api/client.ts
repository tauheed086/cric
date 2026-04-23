const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? 'local-admin-token';
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME ?? 'Scorer-1';

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json();
    if (Array.isArray(body?.message) && body.message.length > 0) {
      return body.message.join(', ');
    }
    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // Ignore parse errors and fall back to generic message.
  }
  return fallback;
}

function adminHeaders(path: string): HeadersInit | undefined {
  if (!path.startsWith('/admin')) {
    return undefined;
  }
  return {
    'x-admin-token': ADMIN_TOKEN,
    'x-admin-name': ADMIN_NAME,
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?';
  const noCachePath = `${path}${separator}_=${Date.now()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: adminHeaders(path),
    cache: 'no-store',
  });
  if (res.status === 304) {
    const retry = await fetch(`${API_BASE}${noCachePath}`, {
      headers: adminHeaders(path),
      cache: 'no-store',
    });
    if (!retry.ok) {
      throw new Error(await extractErrorMessage(retry, `GET ${path} failed: ${retry.status}`));
    }
    return (await retry.json()) as T;
  }
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `GET ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
      'x-admin-name': ADMIN_NAME,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `POST ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
      'x-admin-name': ADMIN_NAME,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `PATCH ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'x-admin-token': ADMIN_TOKEN,
      'x-admin-name': ADMIN_NAME,
    },
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `DELETE ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export function eventUrl(path: string) {
  return `${API_BASE}${path}`;
}
