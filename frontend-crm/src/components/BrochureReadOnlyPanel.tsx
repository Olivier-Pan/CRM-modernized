import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

interface CrmBrochureView {
  crm_company_name: string;
  custom_company_name?: string;
  sector?: string;
  website?: string;
  founded_year?: string;
  headcount?: string;
  address?: string;
  revenue?: string;
  starting_salary?: string;
  public_email?: string;
  public_phone?: string;
  linkedin_url?: string;
  instagram_url?: string;
  logo_url?: string;
  presentation?: string;
  sought_profiles?: string;
  recruitment_process?: string;
  roles_offered?: string;
  career_progression?: string;
  abroad_positions?: boolean | null;
  contract_types?: string[];
  other_contract_type?: string;
  locations?: string;
  contact_full_name?: string;
  contact_email?: string;
  contact_phone?: string;
  booth_size?: 'standard' | 'premium' | 'custom' | '';
  pitch_zone?: boolean | null;
  updated_at?: string | null;
}

const CONTRACT_NAMES: Record<string, string> = {
  stage_cesure: 'Stage de césure',
  stage_execution: "Stage d'exécution",
  stage_fin_etude: "Stage de fin d'étude",
  alternance: 'Alternance',
  premier_emploi: 'Premier emploi',
  cdi: 'CDI',
};

const BOOTH_NAMES: Record<string, string> = {
  standard: 'Standard (1 table, 2 chaises)',
  premium: 'Premium (2 tables, 4 chaises, meilleure visibilité)',
  custom: 'Stand personnalisé',
};

export const BrochureReadOnlyPanel: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [data, setData] = useState<CrmBrochureView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CrmBrochureView>(`/companies/${companyId}/brochure`)
      .then((json) => setData(json))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <p style={{ fontSize: 13, opacity: 0.7 }}>Chargement du formulaire exposant…</p>;
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 10,
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#ef4444',
          fontSize: 13,
        }}
      >
        Impossible de charger le formulaire exposant : {error}
      </div>
    );
  }

  if (!data || !data.updated_at) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 10,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          fontSize: 13,
          opacity: 0.8,
        }}
      >
        Cette entreprise n'a pas encore rempli son formulaire sur le portail exposant.
      </div>
    );
  }

  const contracts = [
    ...(data.contract_types || []).map((c) => CONTRACT_NAMES[c] || c),
    ...(data.other_contract_type ? [data.other_contract_type] : []),
  ];

  const row = (label: string, value?: string | null) =>
    value ? (
      <div style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.5 }}>
        <strong style={{ opacity: 0.75 }}>{label} :</strong> <span>{value}</span>
      </div>
    ) : null;

  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          Formulaire Exposant (Lecture seule)
        </h3>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          Dernière soumission : {new Date(data.updated_at).toLocaleString('fr-FR')}
        </span>
      </div>

      {/* Bloc interne Genius */}
      <div
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Contact & Logistique (Interne Genius)
        </div>
        {row('Contact événement', data.contact_full_name)}
        {row('Mail contact', data.contact_email)}
        {row('Téléphone contact', data.contact_phone)}
        {row('Taille du stand', data.booth_size ? BOOTH_NAMES[data.booth_size] : 'Non renseigné')}
        {row(
          'Zone de pitch (10 min)',
          data.pitch_zone === null || data.pitch_zone === undefined
            ? 'Non renseigné'
            : data.pitch_zone
            ? 'Oui'
            : 'Non'
        )}
      </div>

      {/* Bloc Brochure Élèves */}
      <div
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Données Brochure (Partagées aux élèves)
        </div>
        {data.logo_url && (
          <div style={{ marginBottom: 12 }}>
            <img
              src={data.logo_url}
              alt="Logo entreprise"
              style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', background: '#fff', padding: 6, borderRadius: 6 }}
            />
          </div>
        )}
        {row('Nom brochure', data.custom_company_name || data.crm_company_name)}
        {row('Secteur', data.sector)}
        {row('Site web', data.website)}
        {row('Effectif', data.headcount)}
        {row('Année de création', data.founded_year)}
        {row('Adresse', data.address)}
        {row("Chiffre d'affaires", data.revenue)}
        {row("Salaire à l'embauche", data.starting_salary)}
        {row('Mail candidats', data.public_email)}
        {row('Téléphone candidats', data.public_phone)}
        {row('LinkedIn', data.linkedin_url)}
        {row('Instagram', data.instagram_url)}
        {row('Implantation', data.locations)}
        {row(
          "Poste à l'étranger",
          data.abroad_positions === null || data.abroad_positions === undefined
            ? undefined
            : data.abroad_positions
            ? 'Oui'
            : 'Non'
        )}
        {contracts.length > 0 && row('Types de contrat', contracts.join(', '))}
        {row('Présentation', data.presentation)}
        {row('Métiers proposés', data.roles_offered)}
        {row('Profils recherchés', data.sought_profiles)}
        {row('Processus de recrutement', data.recruitment_process)}
        {row('Évolution de carrière', data.career_progression)}
      </div>
    </div>
  );
};