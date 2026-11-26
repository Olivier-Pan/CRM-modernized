import React, { useState } from 'react';
import { listCompanyContacts, createContact, updateContact } from '../../api/contacts';
import type { FollowUp } from '../../api/follow_ups';
import { useTheme } from '../../hooks/useTheme';
import type { Contact, Shark, SharkStatus, AuthUser, Member } from '../../types';
import ContactCard from './ContactCard';
import ContactForm, { type ContactFormValues } from './ContactForm';
import {
  getCompanyDetailTheme,
  CompanyDetailStyles,
  btnPrimaryStyle,
  btnSecondaryStyle,
} from './styles';

interface CompanyContactsSectionProps {
  companyId: string;
  companyStatus: string;
  contacts: Contact[];
  sharks: Shark[];
  followUps: FollowUp[];
  me: AuthUser | null;
  members: Member[];
  onContactCreated: (created: Contact) => void;
  onContactUpdated: (updated: Contact) => void;
  onContactsReplaced: (updatedList: Contact[]) => void;
  onRequestDeleteContact: (contactId: string) => void;
  onSharkAssigned: (shark: Shark) => void;
  onRequestUnassignShark: (sharkId: string) => void;
  onFollowUpAdded: (fup: FollowUp) => void;
  onFollowUpUpdated: (fup: FollowUp) => void;
  onFollowUpRemoved: (fupId: string) => void;
  onRequestDeleteFollowUp: (fupId: string) => void;
  onStatusChange: (newStatus: SharkStatus) => Promise<void>;
}

export default function CompanyContactsSection({
  companyId,
  companyStatus,
  contacts,
  sharks,
  followUps,
  me,
  members,
  onContactCreated,
  onContactUpdated,
  onContactsReplaced,
  onRequestDeleteContact,
  onSharkAssigned,
  onRequestUnassignShark,
  onFollowUpAdded,
  onFollowUpUpdated,
  onFollowUpRemoved,
  onRequestDeleteFollowUp,
  onStatusChange,
}: CompanyContactsSectionProps) {
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

  const [showAddContact, setShowAddContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  async function handleAddContact(values: ContactFormValues) {
    setSavingContact(true);
    try {
      const is_primary = values.is_primary || contacts.length === 0;
      const created = await createContact(companyId, {
        ...values,
        first_name: values.contact_type === 'person' ? values.first_name : '',
        last_name: values.contact_type === 'person' ? values.last_name : '',
        is_primary,
      });
      onContactCreated(created);
      setShowAddContact(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleSetPrimaryContact(contactId: string) {
    try {
      await updateContact(contactId, { is_primary: true });
      const updatedContacts = await listCompanyContacts(companyId);
      onContactsReplaced(updatedContacts);
    } catch {
      alert('Erreur lors de la mise à jour du contact principal.');
    }
  }

  const sortedContacts = [...contacts].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

  return (
    <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 32, marginBottom: 24 }}>
      <CompanyDetailStyles theme={theme} />

      {/* En-tête de section avec compteur */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.textTitle }}>
              Points de contact & Suivi
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9',
                color: t.textSubMuted,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {contacts.length}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textSubMuted }}>
            Interlocuteurs, responsables assignés et chronologie des relances.
          </p>
        </div>

        {!showAddContact && (
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className="crm-btn crm-btn-primary"
            style={{ ...btnPrimaryStyle, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau contact
          </button>
        )}
      </div>

      {/* Panneau d'ajout de contact */}
      {showAddContact && (
        <div
          className="crm-timeline-item"
          style={{
            background: t.bgMain,
            borderRadius: 14,
            border: '1px solid rgba(139, 92, 246, 0.35)',
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textTitle }}>
              Nouveau point de contact
            </h3>
            <button
              type="button"
              onClick={() => setShowAddContact(false)}
              className="crm-icon-btn"
              style={{
                background: 'none',
                border: '1px solid transparent',
                borderRadius: 7,
                color: t.textMuted,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Fermer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <ContactForm
            submitLabel="Ajouter le contact"
            saving={savingContact}
            showPrimaryToggle={contacts.length > 0}
            isFirstContact={contacts.length === 0}
            onSubmit={handleAddContact}
            onCancel={() => setShowAddContact(false)}
          />
        </div>
      )}

      {/* État vide */}
      {sortedContacts.length === 0 && !showAddContact && (
        <div
          style={{
            padding: '44px 24px',
            textAlign: 'center',
            background: t.bgMain,
            borderRadius: 14,
            border: `1px dashed ${t.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(139, 92, 246, 0.12)',
              color: t.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textTitle }}>
            Aucun contact enregistré
          </div>
          <p style={{ margin: 0, fontSize: 13, color: t.textSubMuted, maxWidth: 380 }}>
            Ajoute un interlocuteur, une adresse générique ou une page LinkedIn pour démarrer le suivi de prospection.
          </p>
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className="crm-btn crm-btn-secondary"
            style={{ ...btnSecondaryStyle(t), marginTop: 6, color: t.primary, borderColor: 'rgba(139, 92, 246, 0.35)' }}
          >
            + Ajouter un premier contact
          </button>
        </div>
      )}

      {/* Liste des cartes contacts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedContacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            companyId={companyId}
            companyStatus={companyStatus}
            assignedShark={sharks.find((s) => s.contact_id === contact.id)}
            contactFollowUps={followUps.filter((f) => f.contact_id === contact.id)}
            me={me}
            members={members}
            onContactUpdated={onContactUpdated}
            onSetPrimary={handleSetPrimaryContact}
            onRequestDeleteContact={onRequestDeleteContact}
            onSharkAssigned={onSharkAssigned}
            onRequestUnassignShark={onRequestUnassignShark}
            onFollowUpAdded={onFollowUpAdded}
            onFollowUpUpdated={onFollowUpUpdated}
            onFollowUpRemoved={onFollowUpRemoved}
            onRequestDeleteFollowUp={onRequestDeleteFollowUp}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}