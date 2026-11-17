export type Role = 'Admin' | 'Member';

export type SharkStatus =
  | 'ToContact'
  | 'Contacted'
  | 'InDiscussion'
  | 'VerbalAgreement'
  | 'Signed'
  | 'Refused'
  | 'NoAnswer';

export type ContactMethod = 'Email' | 'LinkedIn' | string;

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  is_admin: boolean;
}

export interface Company {
  id: string;
  edition_id?: string | null;
  name: string;
  logo_url?: string | null;
  sector?: string | null;
  size?: string | null;
  description?: string | null;
  website?: string | null;
  global_status: string;
  novatech_offer?: boolean | null;
  forum_contract_date?: string | null;
  internal_remark?: string | null;
  company_password?: string | null;
  created_at: string;
  updated_at: string
  legal_name?: string | null;
}

export interface Shark {
  id: string;
  member_id: string;
  company_id: string;
  contact_method: ContactMethod;
  contact_date?: string;
  contact_id?: string;
  status: SharkStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Edition {
  id: string;
  year: number;
  name: string;
  event_date?: string;
  is_active: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role | 'Company';
  is_admin: boolean; 
}

// ──────────────────────────────────────────────
// Display helpers
// ──────────────────────────────────────────────

export const SHARK_STATUS_LABELS: Record<SharkStatus, string> = {
  ToContact: 'À contacter',
  Contacted: 'Contacté',
  InDiscussion: 'En discussion',
  VerbalAgreement: 'Accord verbal',
  Signed: 'Signé',
  Refused: 'Refusé',
  NoAnswer: 'Sans réponse',
};

export const SHARK_STATUS_COLORS: Record<SharkStatus, string> = {
  ToContact: '#6b7280',
  Contacted: '#3b82f6',
  InDiscussion: '#f59e0b',
  VerbalAgreement: '#8b5cf6',
  Signed: '#22c55e',
  Refused: '#ef4444',
  NoAnswer: '#9ca3af',
};

export type ContactType = 'person' | 'generic_email' | 'company_linkedin' | 'website_form';

export interface Contact {
  id: string;
  company_id: string;
  contact_type: ContactType;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  is_primary: boolean;
  created_at: string;
}
