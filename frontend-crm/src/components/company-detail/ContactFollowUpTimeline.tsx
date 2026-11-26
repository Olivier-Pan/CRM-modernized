import { useState } from 'react';
import { createFollowUp, updateFollowUp, deleteFollowUp, type FollowUp } from '../../api/follow_ups';
import { daysSince, parseLocalDate } from '../../lib/dates';
import { INACTIVE_RELANCE_STATUSES } from '../../lib/status';
import type { AuthUser, SharkStatus } from '../../types';
import { IconCheck, IconClose } from '../ui/Icons';
import styles from './ContactFollowUpTimeline.module.css';

type FollowUpChannel = 'Email' | 'LinkedIn' | 'Appel';

const CHANNELS: FollowUpChannel[] = ['Email', 'LinkedIn', 'Appel'];

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
  const [editingDates, setEditingDates] = useState(false);
  const [channel, setChannel] = useState<FollowUpChannel>('Email');
  const [noteDraft, setNoteDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAddFollowUp(systemNote?: 'Passé en discussion' | 'Abandonné') {
    if (!me || submitting) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const newFup = await createFollowUp(companyId, {
        member_id: me.id,
        contact_id: contactId,
        follow_up_date: today,
        method: systemNote ? 'Email' : channel,
        notes: systemNote ?? (noteDraft.trim() || undefined),
      });
      onFollowUpAdded(newFup);

      if (!systemNote) {
        setNoteDraft('');
        if (companyStatus === 'ToContact') {
          await onStatusChange('Contacted');
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'ajout de la relance");
    } finally {
      setSubmitting(false);
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
  const isInactive = INACTIVE_RELANCE_STATUSES.includes(companyStatus as SharkStatus);
  const needsFollowUpAlert = Boolean(lastFup && diffDays >= 7 && !isInactive);

  const regularCount = followUps.filter(
    (f) => f.notes !== 'Passé en discussion' && f.notes !== 'Abandonné'
  ).length;

  let regularIndex = 0;

  return (
    <div className={styles.root}>
      <div className={styles.layout}>
        <div className={styles.timelineCol}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.microLabel}>Chronologie</span>
              {lastFup && (
                <span className={`${styles.metaPill} tabular-nums`}>
                  {formatRelativeLabel(diffDays)}
                </span>
              )}
              {needsFollowUpAlert && (
                <span className={`${styles.alertPill} tabular-nums`}>
                  Relance recommandée ({diffDays}j)
                </span>
              )}
            </div>

            {followUps.length > 0 && (
              <button
                type="button"
                onClick={() => setEditingDates((v) => !v)}
                className={`crm-btn crm-btn-ghost crm-btn-sm ${editingDates ? styles.editActiveBtn : ''}`}
              >
                {editingDates ? 'Terminer' : 'Modifier les dates'}
              </button>
            )}
          </div>

          {followUps.length === 0 ? (
            <div className={styles.emptyBox}>
              Aucune prise de contact enregistrée. Utilise le bloc à droite pour démarrer le suivi.
            </div>
          ) : (
            <div className={styles.list}>
              {followUps.map((fup, idx) => {
                const isLast = idx === followUps.length - 1;
                const isDiscussion = fup.notes === 'Passé en discussion';
                const isAbandoned = fup.notes === 'Abandonné';
                const isSystem = isDiscussion || isAbandoned;

                let stepLabel = '';
                if (isDiscussion) stepLabel = 'Passé en discussion';
                else if (isAbandoned) stepLabel = 'Abandonné (sans réponse)';
                else {
                  stepLabel = regularIndex === 0 ? '1er contact effectué' : `Relance #${regularIndex}`;
                  regularIndex += 1;
                }

                const dotClass = isDiscussion
                  ? styles.dotWarning
                  : isAbandoned
                  ? styles.dotDanger
                  : idx === 0
                  ? styles.dotPrimary
                  : styles.dotMuted;

                return (
                  <div key={fup.id} className={styles.item}>
                    <div className={styles.rail}>
                      <div className={styles.dotWrap}>
                        <div className={`${styles.dot} ${dotClass}`} />
                      </div>
                      {!isLast && <div className={styles.line} />}
                    </div>

                    <div className={`${styles.itemBody} ${isLast ? styles.itemBodyLast : ''}`}>
                      <div className={styles.itemRow}>
                        <div className={styles.stepLeft}>
                          <span className={`${styles.stepLabel} ${isLast ? styles.stepLabelLast : ''}`}>
                            {stepLabel}
                          </span>
                          {!isSystem && fup.method && (
                            <span className={styles.methodTag}>{fup.method}</span>
                          )}
                        </div>

                        {editingDates ? (
                          <div className={styles.dateEditRow}>
                            <input
                              type="date"
                              className={`crm-input ${styles.dateInput}`}
                              value={fup.follow_up_date.split('T')[0]}
                              onChange={(e) => handleUpdateDate(fup.id, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => onRequestDeleteFollowUp(fup.id)}
                              title="Supprimer cette étape"
                              className={`crm-icon-btn crm-icon-btn-danger ${styles.deleteStepBtn}`}
                            >
                              <IconClose size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className={`${styles.dateLabel} tabular-nums`}>
                            {parseLocalDate(fup.follow_up_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {!isSystem && fup.notes && <div className={styles.noteText}>{fup.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actionPanel}>
          <div className={styles.microLabel}>Action suivante</div>

          {contactStatus === 'InDiscussion' ? (
            <>
              <div className={`${styles.statusBanner} ${styles.statusWarning}`}>En discussion</div>
              <button
                type="button"
                onClick={() => handleCancelStatus('InDiscussion')}
                className={`crm-btn crm-btn-secondary crm-btn-sm ${styles.fullWidth}`}
              >
                Annuler ce statut
              </button>
            </>
          ) : contactStatus === 'NoAnswer' ? (
            <>
              <div className={`${styles.statusBanner} ${styles.statusDanger}`}>Sans réponse</div>
              <button
                type="button"
                onClick={() => handleCancelStatus('NoAnswer')}
                className={`crm-btn crm-btn-secondary crm-btn-sm ${styles.fullWidth}`}
              >
                Reprendre le suivi
              </button>
            </>
          ) : (
            <>
              <div role="group" aria-label="Canal de contact" className={styles.channelGroup}>
                {CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`${styles.channelBtn} ${channel === ch ? styles.channelBtnActive : ''}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className={`crm-input ${styles.noteInput}`}
                placeholder="Note rapide (optionnel)…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                disabled={submitting}
              />

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAddFollowUp()}
                className={`crm-btn crm-btn-primary crm-btn-sm ${styles.fullWidth}`}
              >
                <IconCheck size={13} />
                <span>{regularCount === 0 ? 'Marquer contacté' : `Relance #${regularCount}`}</span>
              </button>

              {followUps.length > 0 && (
                <div className={styles.secondaryActions}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      await handleAddFollowUp('Passé en discussion');
                      await onStatusChange('InDiscussion');
                    }}
                    className="crm-btn crm-btn-amber crm-btn-sm"
                  >
                    Discussion
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      await handleAddFollowUp('Abandonné');
                      await onStatusChange('NoAnswer');
                    }}
                    className="crm-btn crm-btn-ghost-danger crm-btn-sm"
                  >
                    Abandonner
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}