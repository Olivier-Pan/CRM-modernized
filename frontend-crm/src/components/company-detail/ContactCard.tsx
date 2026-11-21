import React, { useState } from 'react';
import { updateContact } from '../../api/contacts';
import { assignShark } from '../../api/sharks';
import { createFollowUp, updateFollowUp, deleteFollowUp, type FollowUp } from '../../api/follow_ups';
import { useTheme } from '../../hooks/useTheme';
import type { Contact, ContactType, Shark, SharkStatus, AuthUser, Member } from '../../types';
import {
  getCompanyDetailTheme,
  externalHref,
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

  // Édition du contact
  const [editingContact, setEditingContact] = useState(false);
  const [editContactForm, setEditContactForm] = useState({
    contact_type: contact.contact_type,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    linkedin_url: contact.linkedin_url || '',
  });
  const [savingEditContact, setSavingEditContact] = useState(false);

  // Édition des dates de relances
  const [editingFollowUps, setEditingFollowUps] = useState(false);

  function startEditContact() {
    setEditContactForm({
      contact_type: contact.contact_type,
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin_url: contact.linkedin_url || '',
    });
    setEditingContact(true);
  }

  async function handleSaveEditContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingEditContact(true);
    try {
      const updated = await updateContact(contact.id, {
        contact_type: editContactForm.contact_type,
        first_name: editContactForm.contact_type === 'person' ? editContactForm.first_name : '',
        last_name: editContactForm.contact_type === 'person' ? editContactForm.last_name : '',
        email: editContactForm.email,
        phone: editContactForm.phone,
        linkedin_url: editContactForm.linkedin_url,
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

  async function handleAddFollowUp(customNote?: string) {
    if (!me) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const newFup = await createFollowUp(companyId, {
        member_id: me.id,
        contact_id: contact.id,
        follow_up_date: today,
        method: 'Email',
        notes: customNote,
      });
      onFollowUpAdded(newFup);

      if (companyStatus === 'ToContact' && !customNote) {
        await onStatusChange('Contacted');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'ajout de la relance");
    }
  }

  async function handleUpdateFollowUpDate(fupId: string, newDate: string) {
    try {
      const updated = await updateFollowUp(companyId, fupId, newDate);
      onFollowUpUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de modification');
    }
  }

  async function handleCancelStatus(statusType: 'InDiscussion' | 'NoAnswer') {
    const logNote = statusType === 'InDiscussion' ? 'Passé en discussion' : 'Abandonné';
    const contactLogs = contactFollowUps.filter((f) => f.notes === logNote);
    const log = contactLogs[contactLogs.length - 1];

    try {
      if (log) {
        await deleteFollowUp(companyId, log.id);
        onFollowUpRemoved(log.id);
      }
      await onStatusChange('Contacted');
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'annulation");
    }
  }

  const isMyShark = assignedShark && assignedShark.member_id === me?.id;
  const lastFup = contactFollowUps[contactFollowUps.length - 1];

  let contactStatus: 'Active' | 'InDiscussion' | 'NoAnswer' = 'Active';
  if (lastFup?.notes === 'Passé en discussion') contactStatus = 'InDiscussion';
  else if (lastFup?.notes === 'Abandonné') contactStatus = 'NoAnswer';

  return (
    <div style={{ border: `1px solid ${contact.is_primary ? t.primary : t.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* En-tête du contact */}
      <div
        style={{
          background: contact.is_primary
            ? theme === 'dark'
              ? 'rgba(139, 92, 246, 0.1)'
              : 'rgba(139, 92, 246, 0.05)'
            : t.bgMain,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.bgCard, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {contact.contact_type === 'person' ? '👤' : contact.contact_type === 'company_linkedin' ? '🔗' : '✉️'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: t.textTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              {contact.contact_type === 'person'
                ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Anonyme'
                : CONTACT_TYPE_LABELS[contact.contact_type]}
              {contact.is_primary && (
                <span style={{ fontSize: 10, background: t.primary, color: '#fff', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Principal
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {contact.email && <span>{contact.email}</span>}
              {contact.phone && <span>{contact.phone}</span>}
              {contact.linkedin_url && (
                <a href={externalHref(contact.linkedin_url)} target="_blank" rel="noreferrer" style={{ color: t.primary }}>
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!contact.is_primary && (
            <button
              onClick={() => onSetPrimary(contact.id)}
              style={{ background: 'none', border: 'none', color: t.textSubMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Définir principal
            </button>
          )}
          {!editingContact && (
            <button
              onClick={startEditContact}
              style={{ background: 'none', border: 'none', color: t.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Modifier
            </button>
          )}
          <button
            onClick={() => onRequestDeleteContact(contact.id)}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Formulaire d'édition du contact */}
      {editingContact && (
        <div style={{ padding: '20px 24px', background: t.bgMain, borderTop: `1px solid ${t.border}` }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: t.textTitle }}>
            Modifier le contact
          </h4>
          <form onSubmit={handleSaveEditContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <label style={labelStyle(t.textMuted)}>
                Type de contact *
                <select
                  style={inputStyle(t)}
                  value={editContactForm.contact_type}
                  onChange={(e) => setEditContactForm({ ...editContactForm, contact_type: e.target.value as ContactType })}
                >
                  {Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
              {editContactForm.contact_type === 'person' && (
                <>
                  <label style={labelStyle(t.textMuted)}>
                    Prénom
                    <input
                      style={inputStyle(t)}
                      value={editContactForm.first_name}
                      onChange={(e) => setEditContactForm({ ...editContactForm, first_name: e.target.value })}
                    />
                  </label>
                  <label style={labelStyle(t.textMuted)}>
                    Nom
                    <input
                      style={inputStyle(t)}
                      value={editContactForm.last_name}
                      onChange={(e) => setEditContactForm({ ...editContactForm, last_name: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label style={labelStyle(t.textMuted)}>
                Email
                <input
                  type="email"
                  style={inputStyle(t)}
                  value={editContactForm.email}
                  onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                />
              </label>
              <label style={labelStyle(t.textMuted)}>
                Téléphone
                <input
                  type="tel"
                  style={inputStyle(t)}
                  value={editContactForm.phone}
                  onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                />
              </label>
              <label style={labelStyle(t.textMuted)}>
                Lien LinkedIn
                <input
                  type="url"
                  style={inputStyle(t)}
                  value={editContactForm.linkedin_url}
                  onChange={(e) => setEditContactForm({ ...editContactForm, linkedin_url: e.target.value })}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingContact(false)} style={btnSecondaryStyle(t)}>
                Annuler
              </button>
              <button type="submit" disabled={savingEditContact} style={btnPrimaryStyle}>
                {savingEditContact ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Section Suivi et Historique des Relances */}
      <div style={{ padding: '20px 24px', background: t.bgCard, borderTop: `1px solid ${t.border}` }}>
        {!assignedShark ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: t.textSubMuted }}>Personne n'a encore pris ce contact en charge.</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => handleAssignShark(me?.id || '')} style={{ ...btnSecondaryStyle(t), color: t.textTitle, fontWeight: 600 }}>
                Me l'assigner
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignShark(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{ ...inputStyle(t), padding: '8px 12px', width: 'auto', fontSize: 13, cursor: 'pointer' }}
                defaultValue=""
              >
                <option value="" disabled>Assigner à...</option>
                {members
                  .filter((m) => m.id !== me?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* HEADER : Responsable + Alerte 7 jours */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isMyShark ? t.primary : t.textNormal }}>
                  Responsable : {isMyShark ? 'Moi' : members.find((m) => m.id === assignedShark.member_id)?.name || 'Inconnu'}
                </span>

                {(() => {
                  if (!lastFup) return null;
                  const diffDays = Math.floor((new Date().getTime() - new Date(lastFup.follow_up_date).getTime()) / (1000 * 60 * 60 * 24));
                  const isInactive = ['InDiscussion', 'NoAnswer', 'Signed', 'VerbalAgreement', 'Refused'].includes(companyStatus || '');

                  if (diffDays >= 7 && !isInactive) {
                    return (
                      <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>⚠️</span> +7 jours : À relancer
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              <button
                onClick={() => onRequestUnassignShark(assignedShark.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Se désassigner
              </button>
            </div>

            {/* CORPS : Tableau (Gauche) + Boutons (Droite) */}
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* GAUCHE : Tableau des relances */}
              <div style={{ flex: '1 1 300px', maxWidth: 450 }}>
                {contactFollowUps.length > 0 ? (
                  <div style={{ background: t.bgMain, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <tbody>
                        {contactFollowUps.map((fup, idx) => (
                          <tr key={fup.id} style={{ borderBottom: idx < contactFollowUps.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: t.textTitle }}>
                              {fup.notes === 'Passé en discussion'
                                ? '💬 Passé en discussion'
                                : fup.notes === 'Abandonné'
                                ? '❌ Abandonné (Sans réponse)'
                                : idx === 0
                                ? '✔️ 1er contact'
                                : `🔄 Relance ${idx}`}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {editingFollowUps ? (
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <input
                                    type="date"
                                    value={fup.follow_up_date.split('T')[0]}
                                    onChange={(e) => handleUpdateFollowUpDate(fup.id, e.target.value)}
                                    style={{ ...inputStyle(t), padding: '4px 8px', width: 'auto' }}
                                  />
                                  <button
                                    onClick={() => onRequestDeleteFollowUp(fup.id)}
                                    style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                                  >
                                    ✖
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: t.textNormal }}>{new Date(fup.follow_up_date).toLocaleDateString('fr-FR')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: t.textSubMuted, fontSize: 13, background: t.bgMain, borderRadius: 8, border: `1px dashed ${t.border}` }}>
                    Aucun contact effectué pour le moment.
                  </div>
                )}

                {contactFollowUps.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setEditingFollowUps(!editingFollowUps)}
                      style={{ background: 'none', border: 'none', color: t.textSubMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {editingFollowUps ? 'Terminer la modification' : '✏️ Modifier les dates'}
                    </button>
                  </div>
                )}
              </div>

              {/* DROITE : Boutons d'action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '220px', flexShrink: 0 }}>
                {contactStatus === 'InDiscussion' ? (
                  <div style={{ padding: '16px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#eab308', marginBottom: 12 }}>
                      💬 En discussion
                    </div>
                    <button onClick={() => handleCancelStatus('InDiscussion')} style={{ ...btnSecondaryStyle(t), width: '100%', fontSize: 12 }}>
                      Annuler (Erreur)
                    </button>
                  </div>
                ) : contactStatus === 'NoAnswer' ? (
                  <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>
                      ❌ Abandonné
                    </div>
                    <button onClick={() => handleCancelStatus('NoAnswer')} style={{ ...btnSecondaryStyle(t), width: '100%', fontSize: 12 }}>
                      Annuler (Reprendre)
                    </button>
                  </div>
                ) : (
                  <>
                    {contactFollowUps.length === 0 ? (
                      <button
                        onClick={() => handleAddFollowUp()}
                        style={{ ...btnPrimaryStyle, background: '#3b82f6', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}
                      >
                        ✔️ J'ai contacté
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddFollowUp()}
                        style={{ ...btnPrimaryStyle, background: '#ef4444', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                      >
                        🔄 J'ai relancé
                      </button>
                    )}

                    {contactFollowUps.length > 0 && (
                      <>
                        <button
                          onClick={async () => {
                            await handleAddFollowUp('Passé en discussion');
                            await onStatusChange('InDiscussion');
                          }}
                          style={{ ...btnPrimaryStyle, background: '#eab308', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)' }}
                        >
                          💬 En discussion
                        </button>
                        <button
                          onClick={async () => {
                            await handleAddFollowUp('Abandonné');
                            await onStatusChange('NoAnswer');
                          }}
                          style={{ ...btnSecondaryStyle(t), background: theme === 'dark' ? '#27272a' : '#e2e8f0', borderColor: 'transparent', padding: '14px', width: '100%' }}
                        >
                          ❌ Abandonner
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}