import React, { useState } from 'react';
import { createFollowUp, updateFollowUp, deleteFollowUp, type FollowUp } from '../../api/follow_ups';
import { useTheme } from '../../hooks/useTheme';
import type { SharkStatus, AuthUser } from '../../types';
import { getCompanyDetailTheme, inputStyle } from './styles';

interface ContactFollowUpTimelineProps {
  companyId: string;
  companyStatus: string;
  contactId: string;
  followUps: FollowUp[];
  me: AuthUser | null;
  onFollowUpAdded: (fup: FollowUp) => void;
  onFollowUpUpdated: (fup: FollowUp) => void;
  onFollowUpRemoved: (fupId: string) => void;
  onRequestDeleteFollowUp: (fupId: string) => void;
  onStatusChange: (newStatus: SharkStatus) => Promise<void>;
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysSince(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(isoDate);
  return Math.max(0, Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatRelativeLabel(days: number): string {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days}j`;
}

export default function ContactFollowUpTimeline({
  companyId,
  companyStatus,
  contactId,
  followUps,
  me,
  onFollowUpAdded,
  onFollowUpUpdated,
  onFollowUpRemoved,
  onRequestDeleteFollowUp,
  onStatusChange,
}: ContactFollowUpTimelineProps) {
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);
  const subtleSurface = theme === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc';

  const [editingDates, setEditingDates] = useState(false);

  async function handleAddFollowUp(customNote?: string) {
    if (!me) return;
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const newFup = await createFollowUp(companyId, {
        member_id: me.id,
        contact_id: contactId,
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

  async function handleUpdateDate(fupId: string, newDate: string) {
    try {
      const updated = await updateFollowUp(companyId, fupId, newDate);
      onFollowUpUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de modification');
    }
  }

  async function handleCancelStatus(statusType: 'InDiscussion' | 'NoAnswer') {
    const logNote = statusType === 'InDiscussion' ? 'Passé en discussion' : 'Abandonné';
    const matchingLogs = followUps.filter((f) => f.notes === logNote);
    const lastLog = matchingLogs[matchingLogs.length - 1];

    try {
      if (lastLog) {
        await deleteFollowUp(companyId, lastLog.id);
        onFollowUpRemoved(lastLog.id);
      }
      await onStatusChange('Contacted');
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'annulation");
    }
  }

  const lastFup = followUps[followUps.length - 1];
  let contactStatus: 'Active' | 'InDiscussion' | 'NoAnswer' = 'Active';
  if (lastFup?.notes === 'Passé en discussion') contactStatus = 'InDiscussion';
  else if (lastFup?.notes === 'Abandonné') contactStatus = 'NoAnswer';

  const diffDays = lastFup ? daysSince(lastFup.follow_up_date) : 0;
  const isInactive = ['InDiscussion', 'NoAnswer', 'Signed', 'VerbalAgreement', 'Refused'].includes(companyStatus || '');
  const needsFollowUpAlert = Boolean(lastFup && diffDays >= 7 && !isInactive);

  const regularFollowUpsCount = followUps.filter(
    (f) => f.notes !== 'Passé en discussion' && f.notes !== 'Abandonné'
  ).length;

  return (
    <div style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* COLONNE GAUCHE : Chronologie des échanges */}
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Chronologie
              </span>

              {lastFup && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.textSubMuted,
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatRelativeLabel(diffDays)}
                </span>
              )}

              {needsFollowUpAlert && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    padding: '2px 9px',
                    borderRadius: 999,
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Relance recommandée ({diffDays}j)
                </span>
              )}
            </div>

            {followUps.length > 0 && (
              <button
                type="button"
                onClick={() => setEditingDates(!editingDates)}
                className="crm-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: editingDates ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                  border: `1px solid ${editingDates ? 'rgba(139, 92, 246, 0.35)' : 'transparent'}`,
                  borderRadius: 7,
                  padding: '4px 9px',
                  color: editingDates ? t.primary : t.textSubMuted,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                {editingDates ? 'Terminer' : 'Modifier les dates'}
              </button>
            )}
          </div>

          {followUps.length === 0 ? (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: subtleSurface,
                border: `1px dashed ${t.border}`,
                color: t.textSubMuted,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Aucune prise de contact enregistrée. Utilise le panneau à droite pour démarrer le suivi.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {followUps.map((fup, idx) => {
                const isLast = idx === followUps.length - 1;
                const isDiscussion = fup.notes === 'Passé en discussion';
                const isAbandoned = fup.notes === 'Abandonné';

                const dotColor = isDiscussion
                  ? '#f59e0b'
                  : isAbandoned
                  ? '#ef4444'
                  : idx === 0
                  ? '#8b5cf6'
                  : '#3b82f6';

                const stepLabel = isDiscussion
                  ? 'Passé en discussion'
                  : isAbandoned
                  ? 'Abandonné (sans réponse)'
                  : idx === 0
                  ? '1er contact effectué'
                  : `Relance #${idx}`;

                return (
                  <div
                    key={fup.id}
                    className="crm-timeline-item"
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 14,
                    }}
                  >
                    {/* Rail gauche : Pastille centrée dans une boîte de 24px (= hauteur de la ligne) */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: 18,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: dotColor,
                            boxShadow: `0 0 0 3.5px ${dotColor}24`,
                          }}
                        />
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: 1.5,
                            flex: 1,
                            minHeight: 16,
                            background: t.border,
                            marginTop: 2,
                            marginBottom: 2,
                          }}
                        />
                      )}
                    </div>

                    {/* Contenu droit : Hauteur de ligne fixe à 24px pour un alignement identique sur toutes les lignes */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 24,
                        paddingBottom: isLast ? 0 : 14,
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isLast ? 700 : 500,
                          color: isLast ? t.textTitle : t.textNormal,
                          lineHeight: '24px',
                        }}
                      >
                        {stepLabel}
                      </span>

                      {editingDates ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="date"
                            value={fup.follow_up_date.split('T')[0]}
                            onChange={(e) => handleUpdateDate(fup.id, e.target.value)}
                            style={{ ...inputStyle(t), padding: '3px 8px', width: 'auto', fontSize: 12 }}
                          />
                          <button
                            type="button"
                            onClick={() => onRequestDeleteFollowUp(fup.id)}
                            title="Supprimer cette étape"
                            className="crm-icon-btn crm-icon-btn-danger"
                            style={{
                              color: '#ef4444',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: 6,
                              width: 26,
                              height: 26,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: t.textSubMuted,
                            fontWeight: 500,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: '24px',
                          }}
                        >
                          {parseLocalDate(fup.follow_up_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLONNE DROITE : Poste d'action encadré */}
        <div
          style={{
            width: 248,
            flexShrink: 0,
            padding: 14,
            borderRadius: 12,
            background: subtleSurface,
            border: `1px solid ${t.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            Action suivante
          </div>

          {contactStatus === 'InDiscussion' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 9,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#f59e0b',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                En discussion
              </div>
              <button
                type="button"
                onClick={() => handleCancelStatus('InDiscussion')}
                className="crm-btn crm-btn-secondary"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Annuler ce statut
              </button>
            </div>
          ) : contactStatus === 'NoAnswer' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 9,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ef4444',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Sans réponse
              </div>
              <button
                type="button"
                onClick={() => handleCancelStatus('NoAnswer')}
                className="crm-btn crm-btn-secondary"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Reprendre le suivi
              </button>
            </div>
          ) : (
            <>
              {followUps.length === 0 ? (
                <button
                  type="button"
                  onClick={() => handleAddFollowUp()}
                  className="crm-btn crm-btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Marquer comme contacté
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddFollowUp()}
                    className="crm-btn crm-btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Relance #{regularFollowUpsCount}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleAddFollowUp('Passé en discussion');
                        await onStatusChange('InDiscussion');
                      }}
                      className="crm-btn crm-btn-amber"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Discussion
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleAddFollowUp('Abandonné');
                        await onStatusChange('NoAnswer');
                      }}
                      className="crm-btn crm-btn-ghost-danger"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Abandonner
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}