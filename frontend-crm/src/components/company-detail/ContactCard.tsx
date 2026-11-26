import { useState } from 'react';
import { updateContact } from '../../api/contacts';
import { assignShark } from '../../api/sharks';
import type { FollowUp } from '../../api/follow_ups';
import { copyText } from '../../lib/clipboard';
import type { Contact, Shark, SharkStatus, AuthUser, Member } from '../../types';
import { IconClose, IconUser } from '../ui/Icons';
import ContactForm, { CONTACT_TYPE_LABELS, type ContactFormValues } from './ContactForm';
import ContactFollowUpTimeline from './ContactFollowUpTimeline';
import styles from './ContactCard.module.css';

interface ContactCardProps {
  contact: Contact;
  companyId: string;
  companyStatus: string;
  assignedShark?: Shark;
  contactFollowUps: FollowUp[];
  me: AuthUser | null;
  members: Member[];
  onContactUpdated: (updated: Contact) => void;
  onSetPrimary: (contactId: string) => Promise<void>;
  onRequestDeleteContact: (contactId: string) => void;
  onSharkAssigned: (shark: Shark) => void;
  onRequestUnassignShark: (sharkId: string) => void;
  onFollowUpAdded: (fup: FollowUp) => void;
  onFollowUpUpdated: (fup: FollowUp) => void;
  onFollowUpRemoved: (fupId: string) => void;
  onRequestDeleteFollowUp: (fupId: string) => void;
  onStatusChange: (newStatus: SharkStatus) => Promise<void>;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  return `${f}${l}`.toUpperCase() || '?';
}

function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function ContactCard({
  contact,
  companyId,
  companyStatus,
  assignedShark,
  contactFollowUps,
  me,
  members,
  onContactUpdated,
  onSetPrimary,
  onRequestDeleteContact,
  onSharkAssigned,
  onRequestUnassignShark,
  onFollowUpAdded,
  onFollowUpUpdated,
  onFollowUpRemoved,
  onRequestDeleteFollowUp,
  onStatusChange,
}: ContactCardProps) {
  const [editingContact, setEditingContact] = useState(false);
  const [savingEditContact, setSavingEditContact] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null);

  async function handleCopyField(field: 'email' | 'phone', value: string) {
    const ok = await copyText(value);
    if (!ok) return;
    setCopiedField(field);
    window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1600);
  }

  async function handleSaveEditContact(values: ContactFormValues) {
    setSavingEditContact(true);
    try {
      const updated = await updateContact(contact.id, {
        contact_type: values.contact_type,
        first_name: values.contact_type === 'person' ? values.first_name : '',
        last_name: values.contact_type === 'person' ? values.last_name : '',
        email: values.email,
        phone: values.phone,
        linkedin_url: values.linkedin_url,
      });
      onContactUpdated(updated);
      setEditingContact(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification du contact');
    } finally {
      setSavingEditContact(false);
    }
  }

  async function handleAssignShark(targetMemberId: string) {
    if (!targetMemberId) return;
    const defaultMethod =
      contact.contact_type === 'company_linkedin' || (contact.linkedin_url && !contact.email)
        ? 'LinkedIn'
        : 'Email';

    try {
      const shark = await assignShark({
        company_id: companyId,
        contact_id: contact.id,
        member_id: targetMemberId,
        contact_method: defaultMethod,
      });
      onSharkAssigned(shark);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  const isMyShark = Boolean(assignedShark && assignedShark.member_id === me?.id);
  const ownerName = assignedShark
    ? isMyShark
      ? 'Moi'
      : members.find((m) => m.id === assignedShark.member_id)?.name || 'Inconnu'
    : null;

  const displayName =
    contact.contact_type === 'person'
      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contact sans nom'
      : CONTACT_TYPE_LABELS[contact.contact_type] || 'Canal générique';

  return (
    <div className={`${styles.card} ${contact.is_primary ? styles.cardPrimary : ''}`}>
      <div
        className={`${styles.header} ${contact.is_primary ? styles.headerPrimary : ''} ${
          assignedShark || editingContact ? styles.headerBordered : ''
        }`}
      >
        <div className={styles.identity}>
          <div className={`${styles.avatar} ${contact.is_primary ? styles.avatarPrimary : ''}`}>
            {contact.contact_type === 'person' ? (
              getInitials(contact.first_name, contact.last_name)
            ) : contact.contact_type === 'company_linkedin' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            )}
          </div>

          <div className={styles.identityBody}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{displayName}</span>
              {contact.is_primary && <span className={styles.primaryBadge}>Principal</span>}
              {contact.contact_type !== 'person' && (
                <span className={styles.genericBadge}>Canal générique</span>
              )}
            </div>

            {(contact.email || contact.phone || contact.linkedin_url) && (
              <div className={styles.channelsRow}>
                {contact.email && (
                  <div className={styles.emailGroup}>
                    <button
                      type="button"
                      onClick={() => handleCopyField('email', contact.email!)}
                      title="Cliquer pour copier l'email"
                      className={`${styles.pill} ${copiedField === 'email' ? styles.pillCopied : ''}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span>{copiedField === 'email' ? 'Copié' : contact.email}</span>
                    </button>

                    <a
                      href={`mailto:${encodeURIComponent(contact.email)}`}
                      title="Ouvrir dans la messagerie"
                      className={`crm-icon-btn ${styles.smallIconBtn}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <button
                    type="button"
                    onClick={() => handleCopyField('phone', contact.phone!)}
                    title="Cliquer pour copier le numéro"
                    className={`${styles.pill} ${copiedField === 'phone' ? styles.pillCopied : ''}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{copiedField === 'phone' ? 'Numéro copié' : contact.phone}</span>
                  </button>
                )}

                {contact.linkedin_url && (
                  <a
                    href={externalHref(contact.linkedin_url)}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.pill} ${styles.pillLink}`}
                  >
                    <span>LinkedIn</span>
                    <span aria-hidden="true">&#8599;</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightActions}>
          {!assignedShark ? (
            <div className={styles.assignGroup}>
              <button
                type="button"
                onClick={() => handleAssignShark(me?.id || '')}
                className={`crm-btn crm-btn-secondary crm-btn-sm ${styles.assignSelfBtn}`}
              >
                <IconUser size={13} />
                <span>M'assigner</span>
              </button>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignShark(e.target.value);
                    e.target.value = '';
                  }
                }}
                className={`crm-select ${styles.assignSelect}`}
                defaultValue=""
                title="Assigner à un autre membre"
                aria-label="Assigner à un autre membre"
              >
                <option value="" disabled>
                  Assigner…
                </option>
                {members
                  .filter((m) => m.id !== me?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className={`${styles.ownerChip} ${isMyShark ? styles.ownerChipMine : ''}`}>
              <IconUser size={13} />
              <span>{ownerName}</span>
              <button
                type="button"
                onClick={() => onRequestUnassignShark(assignedShark.id)}
                title="Se désassigner de ce contact"
                className={`crm-icon-btn crm-icon-btn-danger ${styles.unassignBtn}`}
              >
                <IconClose size={12} />
              </button>
            </div>
          )}

          <div className={styles.divider} />

          <div className={styles.iconGroup}>
            {!contact.is_primary && (
              <button
                type="button"
                onClick={() => onSetPrimary(contact.id)}
                title="Définir comme contact principal"
                className={`crm-icon-btn ${styles.surfaceIconBtn}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )}

            {!editingContact && (
              <button
                type="button"
                onClick={() => setEditingContact(true)}
                title="Modifier les informations du contact"
                className={`crm-icon-btn ${styles.surfaceIconBtn}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRequestDeleteContact(contact.id)}
              title="Supprimer ce contact"
              className={`crm-icon-btn crm-icon-btn-danger ${styles.surfaceIconBtn}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {editingContact && (
        <div className={`${styles.editPanel} ${assignedShark ? styles.editPanelBordered : ''}`}>
          <div className={styles.editTitle}>Modifier les informations du contact</div>
          <ContactForm
            initialValues={{
              contact_type: contact.contact_type,
              first_name: contact.first_name || '',
              last_name: contact.last_name || '',
              email: contact.email || '',
              phone: contact.phone || '',
              linkedin_url: contact.linkedin_url || '',
            }}
            submitLabel="Enregistrer"
            saving={savingEditContact}
            onSubmit={handleSaveEditContact}
            onCancel={() => setEditingContact(false)}
          />
        </div>
      )}

      {assignedShark && (
        <ContactFollowUpTimeline
          companyId={companyId}
          companyStatus={companyStatus}
          contactId={contact.id}
          followUps={contactFollowUps}
          me={me}
          onFollowUpAdded={onFollowUpAdded}
          onFollowUpUpdated={onFollowUpUpdated}
          onFollowUpRemoved={onFollowUpRemoved}
          onRequestDeleteFollowUp={onRequestDeleteFollowUp}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}