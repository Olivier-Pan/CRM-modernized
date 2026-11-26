export type ContractOption =
  | 'stage_cesure'
  | 'stage_execution'
  | 'stage_fin_etude'
  | 'alternance'
  | 'premier_emploi'
  | 'cdi';

export type BoothSize = 'standard' | 'premium' | 'custom' | '';

export interface BrochureSpeaker {
  full_name: string;
  role: string;
}

export const MAX_SPEAKERS = 8;

export interface BrochureFormData {
  // 01. Votre entreprise (partagé élèves)
  crm_company_name: string;
  custom_company_name: string;
  sector: string;
  website: string;
  founded_year: string;
  headcount: string;
  address: string;
  revenue: string;
  starting_salary: string;
  public_email: string;
  public_phone: string;
  linkedin_url: string;
  instagram_url: string;
  logo_url: string;

  // 02. Description de l'offre proposée (partagé élèves)
  presentation: string;
  sought_profiles: string;
  recruitment_process: string;
  roles_offered: string;
  career_progression: string;
  abroad_positions: boolean | null;
  contract_types: ContractOption[];
  other_contract_type: string;
  locations: string;

  // 03. Votre contact événement (interne Genius uniquement)
  contact_full_name: string;
  contact_email: string;
  contact_phone: string;

  // 04. Stand & Zone de pitch (interne Genius uniquement)
  booth_size: BoothSize;
  pitch_zone: boolean | null;

  // 05. Intervenants présents le jour du forum (interne Genius uniquement)
  speakers: BrochureSpeaker[];

  // Métadonnées backend
  is_locked?: boolean;
  updated_at?: string;
}

export const CONTRACT_LABELS: Record<ContractOption, string> = {
  stage_cesure: 'Stage de césure',
  stage_execution: "Stage d'exécution",
  stage_fin_etude: "Stage de fin d'étude",
  alternance: 'Alternance',
  premier_emploi: 'Premier emploi',
  cdi: 'CDI',
};

export const BOOTH_LABELS: Record<Exclude<BoothSize, ''>, { title: string; details: string }> = {
  standard: {
    title: 'Stand Standard',
    details: '1 table, 2 chaises',
  },
  premium: {
    title: 'Stand Premium',
    details: '2 tables, 4 chaises, meilleure visibilité',
  },
  custom: {
    title: 'Stand personnalisé',
    details: 'Nous contacter à contact@genius-cs.fr pour discuter des modalités',
  },
};

export function getEffectiveCompanyName(data: BrochureFormData): string {
  return data.custom_company_name.trim() || data.crm_company_name.trim();
}