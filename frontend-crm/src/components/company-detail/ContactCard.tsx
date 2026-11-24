import React, { useState } from 'react';
import { updateContact } from '../../api/contacts';
import { assignShark } from '../../api/sharks';
import type { FollowUp } from '../../api/follow_ups';
import { copyText } from '../../lib/clipboard';
import { useTheme } from '../../hooks/useTheme';
import type { Contact, Shark, SharkStatus, AuthUser, Member } from '../../types';
import { getCompanyDetailTheme, externalHref } from './styles';
import ContactForm, { CONTACT_TYPE_LABELS, type ContactFormValues } from './ContactForm';
import ContactFollowUpTimeline from './ContactFollowUpTimeline';

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
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

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
    try {
      const shark = await assignShark({
        company_id: companyId,
        contact_id: contact.id,
        member_id: targetMemberId,
        contact_method: 'Email',
      });
      onSharkAssigned(shark);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  const isMyShark = assignedShark && assignedShark.member_id === me?.id;
  const ownerName = assignedShark
    ? isMyShark
      ? 'Moi'
      : members.find((m) => m.id === assignedShark.member_id)?.name || 'Inconnu'
    : null;

  const displayName =
    contact.contact_type === 'person'
      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contact sans nom'
      : CONTACT_TYPE_LABELS[contact.contact_type];

  const subtleSurface = theme === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc';
  const pillBg = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';

  return (
    <div
      style={{
        border: `1px solid ${contact.is_primary ? 'rgba(139, 92, 246, 0.45)' : t.border}`,
        borderRadius: 14,
        background: t.bgCard,
        overflow: 'hidden',
        boxShadow: contact.is_primary
          ? theme === 'dark'
            ? '0 4px 24px rgba(139, 92, 246, 0.08)'
            : '0 4px 18px rgba(109, 40, 217, 0.06)'
          : 'none',
      }}
    >
      {/* EN-TÊTE UNIFIÉ */}
      <div
        style={{
          padding: '18px 24px',
          background: contact.is_primary
            ? theme === 'dark'
              ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.03) 100%)'
              : 'linear-gradient(90deg, rgba(109, 40, 217, 0.05) 0%, rgba(109, 40, 217, 0.015) 100%)'
            : subtleSurface,
          borderBottom: assignedShark || editingContact ? `1px solid ${t.border}` : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Gauche : Avatar + Nom + Coordonnées */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 260, flex: 1 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: contact.is_primary
                ? 'rgba(139, 92, 246, 0.16)'
                : theme === 'dark'
                ? 'rgba(255, 255, 255, 0.06)'
                : '#e2e8f0',
              color: contact.is_primary ? t.primary : t.textTitle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
              border: `1px solid ${contact.is_primary ? 'rgba(139, 92, 246, 0.3)' : 'transparent'}`,
            }}
          >
            {contact.contact_type === 'person' ? (
              getInitials(contact.first_name, contact.last_name)
            ) : contact.contact_type === 'company_linkedin' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: t.textTitle }}>{displayName}</span>

              {contact.is_primary && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(139, 92, 246, 0.14)',
                    color: t.primary,
                    border: '1px solid rgba(139, 92, 246, 0.28)',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Principal
                </span>
              )}

              {contact.contact_type !== 'person' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textSubMuted, background: pillBg, padding: '2px 8px', borderRadius: 6 }}>
                  Canal générique
                </span>
              )}
            </div>

            {(contact.email || contact.phone || contact.linkedin_url) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {contact.email && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleCopyField('email', contact.email!)}
                      title="Cliquer pour copier l'email"
                      className="crm-pill-action"
                      style={copyPillStyle(t, copiedField === 'email')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      {copiedField === 'email' ? 'Copié !' : contact.email}
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(contact.email)}`}
                      title="Ouvrir dans votre messagerie"
                      className="crm-icon-btn"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        border: `1px solid ${t.border}`,
                        background: t.bgCard,
                        color: t.textSubMuted,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
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
                    className="crm-pill-action"
                    style={copyPillStyle(t, copiedField === 'phone')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {copiedField === 'phone' ? 'Numéro copié !' : contact.phone}
                  </button>
                )}

                {contact.linkedin_url && (
                  <a
                    href={externalHref(contact.linkedin_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="crm-pill-action"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 7,
                      border: `1px solid ${t.border}`,
                      background: t.bgCard,
                      color: t.primary,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    LinkedIn
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17 17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Droite : Responsable + Icônes d'action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!assignedShark ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleAssignShark(me?.id || '')}
                className="crm-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: t.primary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                M'assigner
              </button>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignShark(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.bgCard,
                  color: t.textSubMuted,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                defaultValue=""
                title="Assigner à un autre membre"
              >
                <option value="" disabled>Assigner…</option>
                {members
                  .filter((m) => m.id !== me?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 10px',
                borderRadius: 8,
                border: `1px solid ${isMyShark ? 'rgba(139, 92, 246, 0.32)' : t.border}`,
                background: isMyShark ? 'rgba(139, 92, 246, 0.1)' : t.bgCard,
                fontSize: 12,
                fontWeight: 600,
                color: isMyShark ? t.primary : t.textNormal,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{ownerName}</span>
              <button
                type="button"
                onClick={() => onRequestUnassignShark(assignedShark.id)}
                title="Se désassigner de ce contact"
                className="crm-icon-btn crm-icon-btn-danger"
                style={{
                  background: 'none',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  color: t.textMuted,
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <div style={{ width: 1, height: 20, background: t.border }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {!contact.is_primary && (
              <button
                type="button"
                onClick={() => onSetPrimary(contact.id)}
                title="Définir comme contact principal"
                className="crm-icon-btn"
                style={iconActionBtnStyle(t)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )}

            {!editingContact && (
              <button
                type="button"
                onClick={() => setEditingContact(true)}
                title="Modifier les informations du contact"
                className="crm-icon-btn"
                style={iconActionBtnStyle(t)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRequestDeleteContact(contact.id)}
              title="Supprimer ce contact"
              className="crm-icon-btn crm-icon-btn-danger"
              style={{ ...iconActionBtnStyle(t), color: '#ef4444' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* FORMULAIRE D'ÉDITION INLINE */}
      {editingContact && (
        <div style={{ padding: '20px 24px', background: t.bgMain, borderBottom: assignedShark ? `1px solid ${t.border}` : 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textTitle, marginBottom: 14 }}>
            Modifier les informations du contact
          </div>
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

      {/* TIMELINE & RELANCES */}
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

const copyPillStyle = (
  t: ReturnType<typeof getCompanyDetailTheme>,
  copied: boolean
): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 7,
  border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.45)' : t.border}`,
  background: copied ? 'rgba(34, 197, 94, 0.12)' : t.bgCard,
  color: copied ? '#22c55e' : t.textNormal,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const iconActionBtnStyle = (
  t: ReturnType<typeof getCompanyDetailTheme>
): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid ${t.border}`,
  background: t.bgCard,
  color: t.textSubMuted,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
});