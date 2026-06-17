import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
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

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

let refreshPromise: Promise<boolean> | null = null;
let pendingRequests: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = [];

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Request-Id', generateRequestId());
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = apiClient.post('/auth/refresh', {}).then(() => true).catch(() => false).finally(() => {
        refreshPromise = null;
      });
    }

    return new Promise<void>((resolve, reject) => {
      pendingRequests.push({ resolve, reject });

      if (pendingRequests.length === 1) {
        refreshPromise!.then((ok) => {
          const q = pendingRequests;
          pendingRequests = [];
          if (ok) {
            resolve(apiClient(originalRequest) as any);
            q.slice(1).forEach((p) => p.resolve());
          } else {
            const err = new ApiRequestError(401, 'TOKEN_EXPIRED', 'Session expired. Please login again.');
            q.forEach((p) => p.reject(err));
          }
        }).catch((err) => {
          const q = pendingRequests;
          pendingRequests = [];
          q.forEach((p) => p.reject(err));
        });
      }
    });
  }
);

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { skipAuth?: boolean; rawResponse?: boolean }
): Promise<T> {
  const config: Record<string, unknown> = {
    method,
    url: path,
    data: body,
  };

  try {
    const response = await apiClient(config);

    if (opts?.rawResponse) {
      return response.data as T;
    }

    const json = response.data as ApiResponse<T>;
    if (!json.success) {
      const err = json as unknown as ApiError;
      throw new ApiRequestError(
        err.error.statusCode ?? response.status,
        err.error.code ?? 'UNKNOWN_ERROR',
        err.error.message ?? 'An unknown error occurred',
        err.error.field
      );
    }

    return json.data;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if (err instanceof AxiosError && err.response?.data) {
      const apiErr = err.response.data as ApiError;
      throw new ApiRequestError(
        apiErr.error.statusCode ?? err.response.status,
        apiErr.error.code ?? 'UNKNOWN_ERROR',
        apiErr.error.message ?? 'Request failed',
        apiErr.error.field
      );
    }
    if (err instanceof AxiosError) {
      throw new ApiRequestError(
        err.response?.status ?? 0,
        'NETWORK_ERROR',
        err.message ?? 'Network request failed'
      );
    }
    throw err;
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
