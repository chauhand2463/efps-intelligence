import type { ApiResponse, ApiError } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let onTokenRefresh: (access: string, refresh: string) => void = () => {};
let onLogout: () => void = () => {};

export function configureApi(config: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRefresh: (access: string, refresh: string) => void;
  onLogout: () => void;
}) {
  getAccessToken = config.getAccessToken;
  getRefreshToken = config.getRefreshToken;
  onTokenRefresh = config.onTokenRefresh;
  onLogout = config.onLogout;
}

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { skipAuth?: boolean; rawResponse?: boolean }
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!opts?.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (opts?.rawResponse) {
    if (!res.ok) {
      throw new ApiRequestError(res.status, 'REQUEST_FAILED', `Request failed with status ${res.status}`);
    }
    return res.text() as unknown as T;
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const json = await res.json() as ApiResponse<T> | ApiError;

  if (!json.success) {
    const err = json as ApiError;
    if (err.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return request<T>(method, path, body, opts);
      }
      onLogout();
    }
    throw new ApiRequestError(
      err.error.statusCode ?? res.status,
      err.error.code ?? 'UNKNOWN_ERROR',
      err.error.message ?? 'An unknown error occurred',
      err.error.field
    );
  }

  return (json as ApiResponse<T>).data;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const json = await res.json();
    if (!json.success) return false;
    onTokenRefresh(json.data.access_token, json.data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string, opts?: { skipAuth?: boolean }) =>
    request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
