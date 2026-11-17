import { apiFetch, setToken, clearToken } from './client';
import type { AuthUser, Member } from '../types';

export interface LoginResponse {
  token: string;
  user: Member;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  setToken(res.token);
  return res;
}

export async function register(name: string, email: string, password: string): Promise<Member> {
  return apiFetch<Member>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
    skipAuth: true,
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export function logout(): void {
  clearToken();
  window.location.href = '/login';
}
