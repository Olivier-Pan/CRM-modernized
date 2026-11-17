import { apiFetch } from './client';
import type { Edition } from '../types';

export async function listEditions(): Promise<Edition[]> {
  return apiFetch<Edition[]>('/editions');
}
