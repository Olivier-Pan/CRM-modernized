import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { ContactType } from '../../types';
import {
  getCompanyDetailTheme,
  labelStyle,
  inputStyle,
  btnPrimaryStyle,
  btnSecondaryStyle,
} from './styles';

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  person: 'Personne physique',
  generic_email: 'Email générique',
  company_linkedin: 'Page LinkedIn',
  website_form: 'Formulaire site web',
};

export interface ContactFormValues {
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  is_primary: boolean;
}

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  submitLabel: string;
  saving: boolean;
  showPrimaryToggle?: boolean;
  isFirstContact?: boolean;
  onSubmit: (values: ContactFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export default function ContactForm({
  initialValues,
  submitLabel,
  saving,
  showPrimaryToggle = false,
  isFirstContact = false,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

  const [form, setForm] = useState<ContactFormValues>({
    contact_type: initialValues?.contact_type ?? 'person',
    first_name: initialValues?.first_name ?? '',
    last_name: initialValues?.last_name ?? '',
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ?? '',
    linkedin_url: initialValues?.linkedin_url ?? '',
    is_primary: initialValues?.is_primary ?? false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <label style={labelStyle(t.textMuted)}>
          Type de canal *
          <select
            style={inputStyle(t)}
            value={form.contact_type}
            onChange={(e) => setForm({ ...form, contact_type: e.target.value as ContactType })}
          >
            {Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>

        {form.contact_type === 'person' && (
          <>
            <label style={labelStyle(t.textMuted)}>
              Prénom
              <input
                style={inputStyle(t)}
                placeholder="Ex: Camille"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </label>
            <label style={labelStyle(t.textMuted)}>
              Nom
              <input
                style={inputStyle(t)}
                placeholder="Ex: Laurent"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </label>
          </>
        )}

        <label style={labelStyle(t.textMuted)}>
          Email
          <input
            type="email"
            style={inputStyle(t)}
            placeholder="camille@entreprise.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label style={labelStyle(t.textMuted)}>
          Téléphone
          <input
            type="tel"
            style={inputStyle(t)}
            placeholder="+33 6 12 34 56 78"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label style={labelStyle(t.textMuted)}>
          Lien LinkedIn
          <input
            type="url"
            style={inputStyle(t)}
            placeholder="https://linkedin.com/in/..."
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
          />
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: showPrimaryToggle || isFirstContact ? 'space-between' : 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        {showPrimaryToggle && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.textNormal, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            Définir comme contact principal
          </label>
        )}

        {!showPrimaryToggle && isFirstContact && (
          <span style={{ fontSize: 12, color: t.textSubMuted }}>
            Ce premier contact sera automatiquement défini comme principal.
          </span>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={btnSecondaryStyle(t)}>
            Annuler
          </button>
          <button type="submit" disabled={saving} style={btnPrimaryStyle}>
            {saving ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}