import { apiFetch } from './client';
import type { Shark, ContactMethod, SharkStatus } from '../types';

export async function listSharks(companyId?: string): Promise<Shark[]> {
  const query = companyId ? `?company_id=${companyId}` : '';
  return apiFetch<Shark[]>(`/sharks${query}`);
}

export async function getMySharks(): Promise<Shark[]> {
  return apiFetch<Shark[]>('/sharks/mine');
}

export async function assignShark(data: {
  company_id: string;
  contact_id?: string; 
  member_id?: string;
  contact_method: ContactMethod;
  contact_date?: string;
  notes?: string;
}): Promise<Shark> {
  return apiFetch<Shark>('/sharks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateShark(
  id: string,
  data: {
    contact_method?: ContactMethod;
    contact_date?: string;
    status?: SharkStatus;
    notes?: string;
    member_id?: string;
  }
): Promise<Shark> {
  return apiFetch<Shark>(`/sharks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteShark(id: string): Promise<void> {
  const response = await fetch(`/api/sharks/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Erreur lors de la désassignation');
  }
}
