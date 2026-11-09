import { ApiLogEntry, AuthUser } from '../types';
import { getStoredUser } from './cognito';

type LogCallback = (entry: ApiLogEntry) => void;
let logListener: LogCallback | null = null;

export function setApiLogListener(listener: LogCallback | null) {
  logListener = listener;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: T; ok: boolean }> {
  const user = getStoredUser();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (user && user.idToken) {
    headers.set('Authorization', `Bearer ${user.idToken}`);
  }

  const method = options.method || 'GET';
  const logId = Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toLocaleTimeString();

  let reqBodyParsed = null;
  if (options.body && typeof options.body === 'string') {
    try {
      reqBodyParsed = JSON.parse(options.body);
    } catch {
      reqBodyParsed = options.body;
    }
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (logListener) {
      logListener({
        id: logId,
        timestamp,
        method,
        url: endpoint,
        status: response.status,
        requestBody: reqBodyParsed,
        responseBody: data,
        isError: !response.ok,
      });
    }

    return { status: response.status, data, ok: response.ok };
  } catch (error: any) {
    if (logListener) {
      logListener({
        id: logId,
        timestamp,
        method,
        url: endpoint,
        status: 0,
        requestBody: reqBodyParsed,
        responseBody: { error: error.message || 'Network / Fetch error' },
        isError: true,
      });
    }
    throw error;
  }
}
