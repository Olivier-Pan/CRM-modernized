import { useState } from 'react';
import { listCompanyContacts, createContact, updateContact } from '../../api/contacts';
import type { FollowUp } from '../../api/follow_ups';
import type { Contact, Shark, SharkStatus, AuthUser, Member } from '../../types';
import { IconClose, IconPlus, IconUser } from '../ui/Icons';
import ContactCard from './ContactCard';
import ContactForm, { type ContactFormValues } from './ContactForm';
import styles from './CompanyContactsSection.module.css';

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

  const sortedContacts = [...contacts].sort(
    (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
  );

  return (
    <div className={`crm-card ${styles.section}`}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Points de contact & Suivi</h2>
            <span className={`${styles.countBadge} tabular-nums`}>{contacts.length}</span>
          </div>
          <p className={styles.subtitle}>
            Interlocuteurs, responsables assignés et chronologie des relances.
          </p>
        </div>

        {!showAddContact && (
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            <IconPlus size={13} />
            <span>Nouveau contact</span>
          </button>
        )}
      </div>

      {showAddContact && (
        <div className={styles.addPanel}>
          <div className={styles.addPanelHeader}>
            <h3 className={styles.addPanelTitle}>Nouveau point de contact</h3>
            <button
              type="button"
              onClick={() => setShowAddContact(false)}
              className="crm-icon-btn"
              aria-label="Fermer"
              title="Fermer"
            >
              <IconClose size={14} />
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

      {sortedContacts.length === 0 && !showAddContact && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <IconUser size={18} />
          </div>
          <div className={styles.emptyTitle}>Aucun contact enregistré</div>
          <p className={styles.emptyText}>
            Ajoute un interlocuteur, une adresse générique ou une page LinkedIn pour démarrer le
            suivi de prospection.
          </p>
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className={`crm-btn crm-btn-secondary crm-btn-sm ${styles.emptyBtn}`}
          >
            <IconPlus size={13} />
            <span>Ajouter un premier contact</span>
          </button>
        </div>
      )}

      <div className={styles.list}>
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