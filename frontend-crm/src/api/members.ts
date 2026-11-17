import { apiFetch } from './client';
import type { Member } from '../types';

export async function getMembers(): Promise<Member[]> {
  return apiFetch<Member[]>('/members');
}

export async function updateMemberRole(id: string, role: 'Admin' | 'Member'): Promise<void> {
  await apiFetch(`/members/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function resetMemberPassword(id: string, new_password: string): Promise<void> {
  await apiFetch(`/members/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password }),
  });
}

export const listMembers = getMembers;