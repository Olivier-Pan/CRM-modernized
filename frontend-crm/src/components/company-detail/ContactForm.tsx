import React, { useState } from 'react';
import type { ContactType } from '../../types';
import styles from './ContactForm.module.css';

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
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        <label className={styles.label}>
          Type de canal *
          <select
            className="crm-select"
            value={form.contact_type}
            onChange={(e) => setForm({ ...form, contact_type: e.target.value as ContactType })}
          >
            {Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {form.contact_type === 'person' && (
          <>
            <label className={styles.label}>
              Prénom
              <input
                className="crm-input"
                placeholder="Ex. Camille"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </label>
            <label className={styles.label}>
              Nom
              <input
                className="crm-input"
                placeholder="Ex. Laurent"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </label>
          </>
        )}

        <label className={styles.label}>
          Email
          <input
            type="email"
            className="crm-input"
            placeholder="camille@entreprise.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label className={styles.label}>
          Téléphone
          <input
            type="tel"
            className="crm-input"
            placeholder="+33 6 12 34 56 78"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label className={styles.label}>
          Lien LinkedIn
          <input
            type="url"
            className="crm-input"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
          />
        </label>
      </div>

      <div className={`${styles.footer} ${showPrimaryToggle || isFirstContact ? styles.footerSplit : ''}`}>
        {showPrimaryToggle && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            <span>Définir comme contact principal</span>
          </label>
        )}

        {!showPrimaryToggle && isFirstContact && (
          <span className={styles.hint}>
            Ce premier contact sera automatiquement défini comme principal.
          </span>
        )}

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className="crm-btn crm-btn-ghost crm-btn-sm">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="crm-btn crm-btn-primary crm-btn-sm">
            {saving ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}