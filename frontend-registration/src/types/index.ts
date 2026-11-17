export interface Company {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_linkedin?: string;
  website?: string;
  sector?: string;
  size?: string;
  description?: string;
  logo_url?: string;
  offers?: string;
  booth_size?: string;
  participation_options?: string; // comma-separated: "conference,workshop,pitch"
  representatives?: string; // JSON: [{"name":"...","role":"..."}]
  special_needs?: string;
  /** Raison sociale : nom juridique, utilisé sur le contrat et la facture. */
  legal_name?: string | null;
  /** Offre couplée Forum CentraleSupélec × Novatech ; null = pas encore répondu. */
  novatech_offer?: boolean | null;
  /** Date de signature du contrat avec le Forum (AAAA-MM-JJ), seulement si l'offre vaut true. */
  forum_contract_date?: string | null;
}

export interface AuthCompany {
  id: string;
  name: string;
  role: 'Company';
}

export interface Representative {
  name: string;
  role: string;
}
