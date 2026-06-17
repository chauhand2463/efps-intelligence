import type { ApiResponse, ApiError } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

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

let refreshPromise: Promise<Response> | null = null;

async function doRefresh(): Promise<Response> {
  return fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: AbortSignal.timeout(5000),
  });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { skipAuth?: boolean; rawResponse?: boolean }
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const execute = async (): Promise<Response> => {
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await execute();

  if (res.status === 401 && path !== '/auth/refresh' && !opts?.skipAuth) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    const refreshRes = await refreshPromise;
    if (refreshRes.ok) {
      res = await execute();
    }
  }

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
    throw new ApiRequestError(
      err.error.statusCode ?? res.status,
      err.error.code ?? 'UNKNOWN_ERROR',
      err.error.message ?? 'An unknown error occurred',
      err.error.field
    );
  }

  return (json as ApiResponse<T>).data;
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
