import type { Dashboard, Job } from './types';

export class SignedOut extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  });
  if (res.status === 401) throw new SignedOut();
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `The monitoring engine answered ${res.status}.`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  me: () => call<{ user: string }>('/api/me'),
  login: (username: string, password: string) =>
    call<{ user: string }>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => call<void>('/api/logout', { method: 'POST' }),
  dashboard: () => call<Dashboard>('/api/dashboard'),
  attempts: (job: Job, date: string) => {
    const q = new URLSearchParams({ type: job.type, name: job.name, date });
    if (job.folder) q.set('folder', job.folder);
    return call<Job[]>(`/api/attempts?${q}`);
  },
};
