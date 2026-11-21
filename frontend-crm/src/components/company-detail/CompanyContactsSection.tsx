import React, { useState } from 'react';
import { listCompanyContacts, createContact, updateContact } from '../../api/contacts';
import type { FollowUp } from '../../api/follow_ups';
import { useTheme } from '../../hooks/useTheme';
import type { Contact, ContactType, Shark, SharkStatus, AuthUser, Member } from '../../types';
import ContactCard, { CONTACT_TYPE_LABELS } from './ContactCard';
import {
  getCompanyDetailTheme,
  labelStyle,
  inputStyle,
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
  const [newContact, setNewContact] = useState({
    contact_type: 'person' as ContactType,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    is_primary: false,
  });
  const [savingContact, setSavingContact] = useState(false);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    try {
      const is_primary = newContact.is_primary || contacts.length === 0;
      const created = await createContact(companyId, { ...newContact, is_primary });
      onContactCreated(created);
      setShowAddContact(false);
      setNewContact({
        contact_type: 'person',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        is_primary: false,
      });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.textTitle }}>Points de contact & Suivi</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textSubMuted }}>Historique des relances pour chaque interlocuteur.</p>
        </div>
        {!showAddContact && (
          <button
            onClick={() => setShowAddContact(true)}
            style={{
              ...btnSecondaryStyle(t),
              color: t.primary,
              borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(109, 40, 217, 0.3)',
            }}
          >
            + Ajouter un contact
          </button>
        )}
      </div>

      {showAddContact && (
        <div style={{ background: t.bgMain, borderRadius: 12, border: `1px solid ${t.border}`, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: t.textTitle }}>Nouveau point de contact</h3>
          <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <label style={labelStyle(t.textMuted)}>
                Type de contact *
                <select
                  style={inputStyle(t)}
                  value={newContact.contact_type}
                  onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value as ContactType })}
                >
                  {Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
              {newContact.contact_type === 'person' && (
                <>
                  <label style={labelStyle(t.textMuted)}>
                    Prénom
                    <input
                      style={inputStyle(t)}
                      value={newContact.first_name}
                      onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    />
                  </label>
                  <label style={labelStyle(t.textMuted)}>
                    Nom
                    <input
                      style={inputStyle(t)}
                      value={newContact.last_name}
                      onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label style={labelStyle(t.textMuted)}>
                Email
                <input
                  type="email"
                  style={inputStyle(t)}
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </label>
              <label style={labelStyle(t.textMuted)}>
                Téléphone
                <input
                  type="tel"
                  style={inputStyle(t)}
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </label>
              <label style={labelStyle(t.textMuted)}>
                Lien LinkedIn
                <input
                  type="url"
                  style={inputStyle(t)}
                  value={newContact.linkedin_url}
                  onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowAddContact(false)} style={btnSecondaryStyle(t)}>
                Annuler
              </button>
              <button type="submit" disabled={savingContact} style={btnPrimaryStyle}>
                {savingContact ? 'Ajout...' : 'Ajouter ce contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {sortedContacts.length === 0 && !showAddContact && (
        <div style={{ padding: 40, textAlign: 'center', color: t.textSubMuted, background: t.bgMain, borderRadius: 12, border: `1px dashed ${t.border}` }}>
          Aucun contact renseigné pour cette entreprise.
        </div>
      )}

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