import { apiFetch } from './client';

export interface FollowUp {
  id: string;
  company_id: string;
  member_id: string;
  contact_id?: string;
  follow_up_date: string;
  method?: string;
  notes?: string;
  created_at: string;
}

export async function listFollowUps(companyId: string): Promise<FollowUp[]> {
  return apiFetch<FollowUp[]>(`/companies/${companyId}/follow-ups`);
}

export async function createFollowUp(companyId: string, data: Partial<FollowUp>): Promise<FollowUp> {
  return apiFetch<FollowUp>(`/companies/${companyId}/follow-ups`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  });
}

export async function deleteFollowUp(companyId: string, followUpId: string): Promise<void> {
  return apiFetch(`/companies/${companyId}/follow-ups/${followUpId}`, { 
    method: 'DELETE' 
  });
}

export async function updateFollowUp(companyId: string, followUpId: string, follow_up_date: string): Promise<FollowUp> {
  return apiFetch<FollowUp>(`/companies/${companyId}/follow-ups/${followUpId}`, { 
    method: 'PUT', 
    body: JSON.stringify({ follow_up_date }) 
  });
}