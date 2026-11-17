export type Role = 'Admin' | 'Member';

export type SharkStatus =
  | 'ToContact'
  | 'Contacted'
  | 'InDiscussion'
  | 'ToFollowUp'
  | 'VerbalAgreement'
  | 'Signed'
  | 'Refused'
  | 'NoAnswer';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Company {
  id: string;
  edition_id: string;
  name: string;
  company_password: string; // shown in plain text in admin view
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  website?: string;
  sector?: string;
  size?: string;
  global_status: SharkStatus;
  description?: string;
  logo_url?: string;
  // TODO(olivier): registration form fields
  timestamps: { created_at: string; updated_at: string };
}

export interface Edition {
  id: string;
  year: number;
  name: string;
  event_date?: string;
  is_active: boolean;
}

export const SHARK_STATUS_LABELS: Record<SharkStatus, string> = {
  ToContact: 'À contacter',
  Contacted: 'Contacté',
  InDiscussion: 'En discussion',
  ToFollowUp: 'À relancer',
  VerbalAgreement: 'Accord verbal',
  Signed: 'Signé',
  Refused: 'Refusé',
  NoAnswer: 'Sans réponse',
};
