import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { formatDateTimeCET } from '../../lib/dates';
import Spinner from '../ui/Spinner';

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
  speakers?: Array<{ full_name: string; role: string }>;
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
  premium: 'Premium (2 tables, 4 chaises)',
  custom: 'Stand personnalisé',
};

function normalizeUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export const BrochureReadOnlyPanel: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [data, setData] = useState<CrmBrochureView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLogoError(false);
    apiFetch<CrmBrochureView>(`/companies/${companyId}/brochure`)
      .then((json) => setData(json))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div className="crm-card" style={{ padding: 20 }}>
        <Spinner label="Chargement du formulaire exposant…" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger-border)',
          color: 'var(--status-danger-text)',
          fontSize: 13,
        }}
      >
        Impossible de charger le formulaire exposant : {error}
      </div>
    );
  }

  if (!data || !data.updated_at) {
    return (
      <div className="crm-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Formulaire exposant
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
          Cette entreprise n'a pas encore soumis son formulaire sur le portail exposant.
        </p>
      </div>
    );
  }

  const contracts = [
    ...(data.contract_types || []).map((c) => CONTRACT_NAMES[c] || c),
    ...(data.other_contract_type ? [data.other_contract_type] : []),
  ];

  const internalFields: Array<{ label: string; value?: string | null }> = [
    { label: 'Contact événement', value: data.contact_full_name },
    { label: 'Email contact', value: data.contact_email },
    { label: 'Téléphone contact', value: data.contact_phone },
    { label: 'Taille du stand', value: data.booth_size ? BOOTH_NAMES[data.booth_size] : undefined },
    {
      label: 'Zone de pitch (10 min)',
      value:
        data.pitch_zone === null || data.pitch_zone === undefined
          ? undefined
          : data.pitch_zone
          ? 'Oui'
          : 'Non',
    },
  ];

  const publicMeta: Array<{ label: string; value?: string | null; isUrl?: boolean }> = [
    { label: 'Nom brochure', value: data.custom_company_name || data.crm_company_name },
    { label: 'Secteur', value: data.sector },
    { label: 'Site web', value: data.website, isUrl: true },
    { label: 'Effectif', value: data.headcount },
    { label: 'Année de création', value: data.founded_year },
    { label: 'Adresse', value: data.address },
    { label: "Chiffre d'affaires", value: data.revenue },
    { label: "Salaire à l'embauche", value: data.starting_salary },
    { label: 'Email candidats', value: data.public_email },
    { label: 'Téléphone candidats', value: data.public_phone },
    { label: 'LinkedIn', value: data.linkedin_url, isUrl: true },
    { label: 'Instagram', value: data.instagram_url, isUrl: true },
    { label: 'Implantation', value: data.locations },
    {
      label: "Poste à l'étranger",
      value:
        data.abroad_positions === null || data.abroad_positions === undefined
          ? undefined
          : data.abroad_positions
          ? 'Oui'
          : 'Non',
    },
    { label: 'Types de contrat', value: contracts.length > 0 ? contracts.join(', ') : undefined },
  ];

  const narrativeFields: Array<{ label: string; value?: string | null }> = [
    { label: 'Présentation', value: data.presentation },
    { label: 'Métiers proposés', value: data.roles_offered },
    { label: 'Profils recherchés', value: data.sought_profiles },
    { label: 'Processus de recrutement', value: data.recruitment_process },
    { label: 'Évolution de carrière', value: data.career_progression },
  ].filter((f) => Boolean(f.value?.trim()));

  const trackedFields = [...internalFields, ...publicMeta, ...narrativeFields];
  const filledCount = trackedFields.filter((f) => Boolean(f.value?.trim())).length;

  return (
    <div className="crm-card" style={{ overflow: 'hidden' }}>
      {/* En-tête */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Formulaire exposant
          </h3>
          <p className="tabular-nums" style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Dernière soumission : {formatDateTimeCET(data.updated_at)}
          </p>
        </div>

        <span
          className="tabular-nums"
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '3px 9px',
            borderRadius: 6,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {filledCount} / {trackedFields.length} champs renseignés
        </span>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 1. Bloc interne Genius */}
        <section
          style={{
            padding: 16,
            borderRadius: 8,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={sectionLabelStyle}>Contact & Logistique (Interne Genius)</div>
          <div style={metaGridStyle}>
            {internalFields.map((field) => (
              <MetaField key={field.label} label={field.label} value={field.value} showEmpty />
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={fieldLabelStyle}>
              Intervenants présents le jour du forum ({data.speakers?.length ?? 0})
            </div>
            {data.speakers && data.speakers.length > 0 ? (
              <ul
                style={{
                  margin: '6px 0 0',
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              >
                {data.speakers.map((sp, i) => (
                  <li key={`${sp.full_name}-${i}`}>
                    <strong>{sp.full_name || 'Sans nom'}</strong>
                    {sp.role ? (
                      <span style={{ color: 'var(--text-secondary)' }}> — {sp.role}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Non renseigné
              </div>
            )}
          </div>
        </section>

        {/* 2. Bloc Brochure Élèves */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={sectionLabelStyle}>Données Brochure (Partagées aux élèves)</div>

          {data.logo_url && !logoError && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={data.logo_url}
                alt="Logo brochure"
                onError={() => setLogoError(true)}
                style={{
                  maxHeight: 52,
                  maxWidth: 180,
                  objectFit: 'contain',
                  background: '#FFFFFF',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                }}
              />
            </div>
          )}

          <div style={metaGridStyle}>
            {publicMeta
              .filter((f) => Boolean(f.value?.trim()))
              .map((field) => (
                <MetaField
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  isUrl={field.isUrl}
                />
              ))}
          </div>

          {narrativeFields.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {narrativeFields.map((field) => (
                <div
                  key={field.label}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={fieldLabelStyle}>{field.label}</div>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function MetaField({
  label,
  value,
  isUrl,
  showEmpty = false,
}: {
  label: string;
  value?: string | null;
  isUrl?: boolean;
  showEmpty?: boolean;
}) {
  const clean = value?.trim();
  if (!clean && !showEmpty) return null;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={fieldLabelStyle}>{label}</div>
      {clean ? (
        isUrl ? (
          <a
            href={normalizeUrl(clean)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              fontSize: 13,
              color: 'var(--accent-text)',
              wordBreak: 'break-all',
              marginTop: 2,
            }}
          >
            {clean} &#8599;
          </a>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-primary)',
              marginTop: 2,
              wordBreak: 'break-word',
            }}
          >
            {clean}
          </div>
        )
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Non renseigné
        </div>
      )}
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-tertiary)',
  marginBottom: 12,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
};

const metaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px 20px',
};