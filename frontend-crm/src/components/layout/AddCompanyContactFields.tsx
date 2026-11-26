import React from 'react';
import type { ContactType } from '../../types';

export interface OptionalCompanyDetails {
  sector: string;
  website: string;
  contactType: ContactType;
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
  assignToMe: boolean;
}

interface Props {
  values: OptionalCompanyDetails;
  disabled: boolean;
  canAssign: boolean;
  onChange: (patch: Partial<OptionalCompanyDetails>) => void;
}

const CONTACT_TYPES: Array<{ value: ContactType; label: string }> = [
  { value: 'person', label: 'Personne physique' },
  { value: 'generic_email', label: 'Email générique' },
  { value: 'company_linkedin', label: 'Page LinkedIn' },
  { value: 'website_form', label: 'Formulaire site web' },
];

export default function AddCompanyContactFields({ values, disabled, canAssign, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 14,
        borderRadius: 8,
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Secteur</label>
          <input
            type="text"
            className="crm-input"
            placeholder="IA, Finance, DeepTech..."
            value={values.sector}
            onChange={(e) => onChange({ sector: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label style={labelStyle}>Site web</label>
          <input
            type="text"
            className="crm-input"
            placeholder="https://..."
            value={values.website}
            onChange={(e) => onChange({ website: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div
        style={{
          paddingTop: 10,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Premier contact (optionnel)
        </div>

        <div>
          <label style={labelStyle}>Canal</label>
          <select
            className="crm-select"
            value={values.contactType}
            onChange={(e) => onChange({ contactType: e.target.value as ContactType })}
            disabled={disabled}
          >
            {CONTACT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {values.contactType === 'person' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input
                type="text"
                className="crm-input"
                placeholder="Camille"
                value={values.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input
                type="text"
                className="crm-input"
                placeholder="Laurent"
                value={values.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              className="crm-input"
              placeholder="contact@entreprise.fr"
              value={values.email}
              onChange={(e) => onChange({ email: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div>
            <label style={labelStyle}>LinkedIn</label>
            <input
              type="url"
              className="crm-input"
              placeholder="https://linkedin.com/in/..."
              value={values.linkedinUrl}
              onChange={(e) => onChange({ linkedinUrl: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>

        {canAssign && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={values.assignToMe}
              onChange={(e) => onChange({ assignToMe: e.target.checked })}
            />
            <span>M'assigner automatiquement ce contact</span>
          </label>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-tertiary)',
  marginBottom: 5,
};