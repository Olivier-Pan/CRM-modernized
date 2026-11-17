import { apiFetch } from './client';
import type { SharkStatus } from '../types';

export interface ActivityLog {
  id: string;
  member_name: string;
  company_name: string;
  old_status: SharkStatus;
  new_status: SharkStatus;
  created_at: string;
}

export async function getLogs(): Promise<ActivityLog[]> {
  return apiFetch<ActivityLog[]>('/logs');
}