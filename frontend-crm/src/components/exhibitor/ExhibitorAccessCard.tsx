import { useEffect, useMemo, useRef, useState } from 'react';
import type { Company } from '../../types';
import { copyText } from '../../lib/clipboard';
import { defaultDeadline, REGISTRATION_URL } from '../../lib/exhibitorEmail';
import { MAIL_TEMPLATES, type MailTemplate } from '../../lib/mailTemplates';
import styles from './ExhibitorAccessCard.module.css';

type CopyKind = 'login' | 'password' | 'both' | 'subject' | 'body';

interface Props {
  company: Company;
  contactEmail?: string;
  editionName?: string;
  editionEventDate?: string;
  senderName?: string;
  senderEmail?: string;
  lastContactDate?: string;
  isAdmin?: boolean;
  onRegenerate: () => Promise<boolean>;
}

const COPY_LABELS: Record<CopyKind, string> = {
  login: 'Identifiant copié',
  password: 'Mot de passe copié',
  both: 'Accès copiés',
  subject: 'Objet copié',
  body: 'Mail copié',
};

export default function ExhibitorAccessCard({
  company,
  contactEmail,
  editionName,
  editionEventDate,
  senderName,
  senderEmail,
  lastContactDate,
  isAdmin = false,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [deadline, setDeadline] = useState(() => defaultDeadline(editionEventDate));
  const [templateId, setTemplateId] = useState(MAIL_TEMPLATES[0].id);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const password = (company.company_password || '').trim();
  const hasPassword = password.length > 0;

  const template: MailTemplate =
    MAIL_TEMPLATES.find((tpl) => tpl.id === templateId) || MAIL_TEMPLATES[0];

  const mail = useMemo(
    () =>
      template.build({
        company,
        contactEmail,
        editionName,
        editionEventDate,
        senderName,
        senderEmail,
        deadline,
        lastContactDate,
      }),
    [
      template,
      company,
      contactEmail,
      editionName,
      editionEventDate,
      senderName,
      senderEmail,
      deadline,
      lastContactDate,
    ]
  );

  const normalizedBody = useMemo(() => mail.body.replace(/\r\n/g, '\n'), [mail.body]);
  const canCopyMail = !template.needsPassword || hasPassword;

  async function handleCopy(kind: CopyKind, text: string) {
    const ok = await copyText(text);
    if (!ok) {
      alert('Copie impossible — sélectionne le texte et copie-le manuellement.');
      return;
    }
    setCopied(kind);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1800);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const ok = await onRegenerate();
    setRegenerating(false);
    if (ok) {
      setConfirmRegen(false);
      setCopied(null);
    }
  }

  return (
    <div className={`crm-card ${styles.card}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Accès exposant</h2>
        <span aria-live="polite" className={styles.copiedStatus}>
          {copied ? COPY_LABELS[copied] : ''}
        </span>
      </div>

      <p className={styles.guideBox}>
        Envoie l'<strong>identifiant</strong> et le <strong>mot de passe</strong> ci-dessous par
        email à ton contact entreprise, puis redirige-le vers{' '}
        <a
          href={REGISTRATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.guideLink}
        >
          entreprise.genius-cs.fr
        </a>{' '}
        pour qu'il remplisse sa fiche exposant.
      </p>

      {/* Identifiant */}
      <div className={styles.credRow}>
        <span className={styles.rowLabel}>Identifiant</span>
        <code className={styles.code}>{company.name}</code>
        <button
          type="button"
          onClick={() => handleCopy('login', company.name)}
          className={`crm-btn crm-btn-ghost crm-btn-sm ${styles.compactBtn}`}
        >
          Copier
        </button>
      </div>

      {/* Mot de passe */}
      <div className={styles.credRow}>
        <span className={styles.rowLabel}>Mot de passe</span>
        {hasPassword ? (
          <div className={styles.credActions}>
            <code className={styles.code}>{password}</code>
            <button
              type="button"
              onClick={() => handleCopy('password', password)}
              className={`crm-btn crm-btn-ghost crm-btn-sm ${styles.compactBtn}`}
            >
              Copier
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'both',
                  `Portail : ${REGISTRATION_URL}\nIdentifiant : ${company.name}\nMot de passe : ${password}`
                )
              }
              className={`crm-btn crm-btn-ghost crm-btn-sm ${styles.compactBtn}`}
            >
              Tout copier
            </button>
          </div>
        ) : (
          <span className={styles.missingPassword}>
            {isAdmin
              ? 'Aucun mot de passe — génère-en un ci-dessous.'
              : 'Aucun mot de passe — demande à un admin d’en générer un.'}
          </span>
        )}
      </div>

      {/* Modèles d'email */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Modèle d'email</div>
        <div className={styles.templateList}>
          {MAIL_TEMPLATES.map((tpl) => {
            const active = tpl.id === template.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplateId(tpl.id)}
                aria-pressed={active}
                title={tpl.hint}
                className={`${styles.templateBtn} ${active ? styles.templateBtnActive : ''}`}
              >
                {tpl.label}
              </button>
            );
          })}
        </div>
        <div className={styles.hint}>{template.hint}</div>

        {/* Date limite */}
        <div className={styles.deadlineBlock}>
          <div className={styles.sectionLabel}>Date limite annoncée</div>
          <input
            type="date"
            className={`crm-input ${styles.deadlineInput}`}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {/* Aperçu du mail */}
        <div className={styles.previewBox}>
          <div className={styles.previewSubjectRow}>
            <div className={styles.previewSubject}>
              <span className={styles.previewSubjectTag}>Objet :</span>
              {mail.subject}
            </div>
            <button
              type="button"
              onClick={() => handleCopy('subject', mail.subject)}
              className={`crm-btn crm-btn-ghost crm-btn-sm ${styles.compactBtn}`}
            >
              {copied === 'subject' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <pre className={styles.previewBody}>{normalizedBody}</pre>
        </div>

        {mail.missing.length > 0 && (
          <div className={styles.warnBox}>
            À compléter avant envoi : {mail.missing.join(', ')}.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actionsRow}>
        <button
          type="button"
          disabled={!canCopyMail}
          onClick={() => handleCopy('body', normalizedBody)}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          {copied === 'body' ? 'Mail copié' : 'Copier le mail'}
        </button>

        {isAdmin && !confirmRegen && (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            className="crm-btn crm-btn-ghost-danger crm-btn-sm"
          >
            Régénérer le mot de passe
          </button>
        )}
      </div>

      {/* Confirmation de régénération (Admin uniquement) */}
      {isAdmin && confirmRegen && (
        <div className={styles.regenConfirm}>
          <div className={styles.regenTitle}>
            Régénérer le mot de passe de {company.name} ?
          </div>
          <div className={styles.regenDesc}>
            L'ancien mot de passe cessera immédiatement de fonctionner. Tu devras lui renvoyer le
            nouveau.
          </div>
          <div className={styles.regenBtns}>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="crm-btn crm-btn-danger crm-btn-sm"
            >
              {regenerating ? 'Régénération…' : 'Oui, régénérer'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRegen(false)}
              disabled={regenerating}
              className="crm-btn crm-btn-secondary crm-btn-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
