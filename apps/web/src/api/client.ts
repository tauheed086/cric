import { AdminRole, type AdminUserSummary } from '@cric/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';
export const DEFAULT_ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? 'local-admin-token';
export const DEFAULT_ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME ?? 'Super Admin';

const ADMIN_TOKEN_KEY = 'cric_admin_token';
const ADMIN_NAME_KEY = 'cric_admin_name';
const ADMIN_ROLE_KEY = 'cric_admin_role';
const ADMIN_USER_ID_KEY = 'cric_admin_user_id';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminName(): string {
  try {
    return localStorage.getItem(ADMIN_NAME_KEY) || DEFAULT_ADMIN_NAME;
  } catch {
    return DEFAULT_ADMIN_NAME;
  }
}

export function getAdminRole(): AdminRole {
  try {
    const role = localStorage.getItem(ADMIN_ROLE_KEY);
    return role === AdminRole.SCORER ? AdminRole.SCORER : AdminRole.SUPER_ADMIN;
  } catch {
    return AdminRole.SUPER_ADMIN;
  }
}

export function getAdminUserId(): string | null {
  try {
    return localStorage.getItem(ADMIN_USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setAdminAuth(token: string, name?: string, role?: AdminRole, userId?: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
    if (name) {
      localStorage.setItem(ADMIN_NAME_KEY, name.trim());
    }
    if (role) {
      localStorage.setItem(ADMIN_ROLE_KEY, role);
    }
    if (userId) {
      localStorage.setItem(ADMIN_USER_ID_KEY, userId);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function clearAdminAuth(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_NAME_KEY);
    localStorage.removeItem(ADMIN_ROLE_KEY);
    localStorage.removeItem(ADMIN_USER_ID_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}

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

function adminHeaders(path: string): Record<string, string> | undefined {
  if (!path.startsWith('/admin')) {
    return undefined;
  }
  const token = getAdminToken();
  return {
    'x-admin-token': token ?? '',
    'x-admin-name': getAdminName(),
  };
}

let activeRequests = 0;
const requestListeners = new Set<(count: number) => void>();

export function getActiveRequestCount(): number {
  return activeRequests;
}

export function subscribeActiveRequests(callback: (count: number) => void): () => void {
  requestListeners.add(callback);
  callback(activeRequests);
  return () => {
    requestListeners.delete(callback);
  };
}

function notifyActiveRequests() {
  requestListeners.forEach((cb) => cb(activeRequests));
}

function handle401Unauthorized(path: string) {
  if (path.startsWith('/admin') && !path.includes('/admin/auth/login')) {
    clearAdminAuth();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cric_admin_unauthorized'));
    }
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  activeRequests++;
  notifyActiveRequests();
  try {
    const separator = path.includes('?') ? '&' : '?';
    const noCachePath = `${path}${separator}_=${Date.now()}`;
    const headers = adminHeaders(path);
    const res = await fetch(`${API_BASE}${path}`, {
      headers,
      cache: 'no-store',
    });
    if (res.status === 304) {
      const retry = await fetch(`${API_BASE}${noCachePath}`, {
        headers,
        cache: 'no-store',
      });
      if (!retry.ok) {
        if (retry.status === 401) handle401Unauthorized(path);
        throw new Error(await extractErrorMessage(retry, `GET ${path} failed: ${retry.status}`));
      }
      return (await retry.json()) as T;
    }
    if (!res.ok) {
      if (res.status === 401) handle401Unauthorized(path);
      throw new Error(await extractErrorMessage(res, `GET ${path} failed: ${res.status}`));
    }
    return (await res.json()) as T;
  } finally {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyActiveRequests();
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(adminHeaders(path) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) handle401Unauthorized(path);
    throw new Error(await extractErrorMessage(res, `POST ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(adminHeaders(path) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) handle401Unauthorized(path);
    throw new Error(await extractErrorMessage(res, `PATCH ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    ...(adminHeaders(path) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) handle401Unauthorized(path);
    throw new Error(await extractErrorMessage(res, `DELETE ${path} failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function apiAdminLogin(
  tokenOrPassword: string,
  adminNameOrUsername?: string,
): Promise<{ success: boolean; token: string; adminName: string; role: AdminRole; userId?: string }> {
  const trimmedToken = tokenOrPassword.trim();
  const trimmedName = (adminNameOrUsername?.trim() || getAdminName()).trim();

  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: trimmedName,
      password: trimmedToken,
    }),
  });

  if (res.ok) {
    const data = (await res.json()) as {
      success: boolean;
      token: string;
      adminName: string;
      role?: AdminRole;
      userId?: string;
    };
    const role = data.role ?? AdminRole.SUPER_ADMIN;
    setAdminAuth(data.token, data.adminName, role, data.userId);
    return {
      ...data,
      role,
    };
  }

  if (res.status === 401) {
    throw new Error('Invalid username or password. Please check your credentials and try again.');
  }

  // For other errors (network, 500, etc.) — do NOT fall through silently.
  const errMsg = await res.text().catch(() => `HTTP ${res.status}`);
  throw new Error(`Login failed: ${errMsg}`);
}

export async function apiListAdminUsers(): Promise<AdminUserSummary[]> {
  return apiGet<AdminUserSummary[]>('/admin/users');
}

export async function apiCreateAdminUser(dto: {
  username: string;
  password?: string;
  name: string;
  role: AdminRole;
  isActive?: boolean;
}): Promise<AdminUserSummary> {
  return apiPost<AdminUserSummary>('/admin/users', dto);
}

export async function apiUpdateAdminUser(
  id: string,
  dto: { name?: string; password?: string; role?: AdminRole; isActive?: boolean },
): Promise<AdminUserSummary> {
  return apiPatch<AdminUserSummary>(`/admin/users/${id}`, dto);
}

export async function apiDeleteAdminUser(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/admin/users/${id}`);
}

export function eventUrl(path: string) {
  return `${API_BASE}${path}`;
}

