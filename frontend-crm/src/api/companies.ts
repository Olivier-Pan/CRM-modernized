import { apiFetch } from './client';
import type { Company } from '../types';

export async function listCompanies(editionId?: string): Promise<Company[]> {
  const query = editionId ? `?edition_id=${editionId}` : '';
  return apiFetch<Company[]>(`/companies${query}`);
}

export async function getCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}`);
}

export interface CreateCompanyPayload {
  edition_id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_linkedin?: string;
  website?: string;
  sector?: string;
  size?: string;
}

export async function createCompany(data: CreateCompanyPayload): Promise<Company> {
  return apiFetch<Company>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Le backend ignore `internal_remark` ici : la remarque a sa propre route
 *  (`updateInternalRemark`). Le type l'exclut pour qu'on ne croie pas l'avoir
 *  sauvegardée. */
export async function updateCompany(
  id: string,
  data: Partial<Omit<Company, 'internal_remark' | 'company_password'>>
): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id: string): Promise<void> {
  return apiFetch<void>(`/companies/${id}`, {
    method: 'DELETE',
  });
}

/** Remplace la remarque interne (`''` l'efface). `expected` = le texte de
 *  départ de l'éditeur : si quelqu'un l'a changé entre-temps, le backend répond
 *  409 avec `current_internal_remark` au lieu d'écraser sa version. */
export async function updateInternalRemark(
  id: string,
  internalRemark: string,
  expected: string
): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/internal-remark`, {
    method: 'PUT',
    body: JSON.stringify({
      internal_remark: internalRemark,
      expected_internal_remark: expected,
    }),
  });
}

export interface RegeneratePasswordResponse {
  id: string;
  company_password: string;
  updated_at: string;
}

export async function regenerateCompanyPassword(
  id: string
): Promise<RegeneratePasswordResponse> {
  return apiFetch<RegeneratePasswordResponse>(`/companies/${id}/regenerate-password`, {
    method: 'POST',
  });
}

