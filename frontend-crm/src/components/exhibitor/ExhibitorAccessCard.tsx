import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Company } from '../../types';
import { copyText } from '../../lib/clipboard';
import { buildMailtoUrl, defaultDeadline, isMailtoTooLong } from '../../lib/exhibitorEmail';
import { MAIL_TEMPLATES, type MailTemplate } from '../../lib/mailTemplates';

type CopyKind = 'login' | 'password' | 'both';

interface Props {
  company: Company;
  contactEmail?: string;
  editionName?: string;
  editionEventDate?: string;
  senderName?: string;
  senderEmail?: string;
  lastContactDate?: string;
  onRegenerate: () => Promise<boolean>;
  onEditContact: () => void;
}

export default function ExhibitorAccessCard({
  company,
  contactEmail,
  editionName,
  editionEventDate,
  senderName,
  senderEmail,
  lastContactDate,
  onRegenerate,
  onEditContact,
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
        editionName,
        editionEventDate,
        senderName,
        senderEmail,
        deadline,
        lastContactDate,
      }),
    [template, company, editionName, editionEventDate, senderName, senderEmail, deadline, lastContactDate]
  );

  const mailtoUrl = useMemo(() => buildMailtoUrl(contactEmail, mail), [contactEmail, mail]);
  const tooLong = isMailtoTooLong(mailtoUrl);

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
    <div className="crm-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Accès exposant
        </h2>
        <span
          aria-live="polite"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-success-text)', minHeight: 16 }}
        >
          {copied ? 'Copié' : ''}
        </span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
        Identifiants du portail brochure. À transmettre uniquement par email au contact.
      </p>

      {/* Identifiant */}
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Identifiant</span>
        <code style={codeStyle}>{company.name}</code>
        <button
          type="button"
          onClick={() => handleCopy('login', company.name)}
          className="crm-btn crm-btn-ghost crm-btn-sm"
          style={{ height: 26, padding: '0 8px' }}
        >
          Copier
        </button>
      </div>

      {/* Mot de passe (visible en clair par défaut) */}
      <div style={{ ...rowStyle, marginTop: 8 }}>
        <span style={rowLabelStyle}>Mot de passe</span>
        {hasPassword ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <code style={codeStyle}>{password}</code>
            <button
              type="button"
              onClick={() => handleCopy('password', password)}
              className="crm-btn crm-btn-ghost crm-btn-sm"
              style={{ height: 26, padding: '0 8px' }}
            >
              Copier
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy('both', `Identifiant : ${company.name}\nMot de passe :${password}`)
              }
              className="crm-btn crm-btn-ghost crm-btn-sm"
              style={{ height: 26, padding: '0 8px' }}
            >
              Tout copier
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--status-warning-text)' }}>
            Aucun mot de passe — régénère-en un.
          </span>
        )}
      </div>

      {/* Modèles d'email */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={sectionLabelStyle}>Modèle d'email</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {MAIL_TEMPLATES.map((tpl) => {
            const active = tpl.id === template.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplateId(tpl.id)}
                aria-pressed={active}
                title={tpl.hint}
                style={{
                  height: 26,
                  padding: '0 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--accent-subtle-bg)' : 'var(--bg-subtle)',
                  color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--accent-subtle-border)' : 'var(--border-subtle)'}`,
                }}
              >
                {tpl.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
          {template.hint}
        </div>
      </div>

      {/* Date limite */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionLabelStyle}>Date limite annoncée</div>
        <input
          type="date"
          className="crm-input"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ height: 34, fontSize: 13 }}
        />
      </div>

      {/* Avertissements */}
      {!contactEmail && (
        <div style={warnStyle}>
          Aucun email de contact enregistré : le brouillon s'ouvrira sans destinataire.{' '}
          <button
            type="button"
            onClick={onEditContact}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              fontWeight: 600,
              textDecoration: 'underline',
              fontSize: 'inherit',
            }}
          >
            Ajouter l'email
          </button>
        </div>
      )}
      {mail.missing.length > 0 && (
        <div style={warnStyle}>À compléter dans le brouillon : {mail.missing.join(', ')}.</div>
      )}
      {tooLong && (
        <div style={warnStyle}>
          Message trop long pour un lien mailto : copie les identifiants et rédige l'email manuellement.
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {(!template.needsPassword || hasPassword) && !tooLong ? (
          <a href={mailtoUrl} className="crm-btn crm-btn-primary crm-btn-sm">
            Ouvrir le brouillon
          </a>
        ) : (
          <button type="button" disabled className="crm-btn crm-btn-primary crm-btn-sm">
            Ouvrir le brouillon
          </button>
        )}

        {!confirmRegen && (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            className="crm-btn crm-btn-ghost-danger crm-btn-sm"
          >
            Régénérer le mot de passe
          </button>
        )}
      </div>

      {/* Confirmation de régénération */}
      {confirmRegen && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--status-danger-border)',
            background: 'var(--status-danger-bg)',
          }}
        >
          <div style={{ fontSize: 12.5, color: 'var(--status-danger-text)', fontWeight: 600, marginBottom: 4 }}>
            Régénérer le mot de passe de {company.name} ?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 10 }}>
            L'ancien mot de passe cessera immédiatement de fonctionner. Tu devras lui renvoyer le nouveau.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  width: 96,
  flexShrink: 0,
};

const codeStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border-subtle)',
  padding: '3px 8px',
  borderRadius: 6,
  fontSize: 12.5,
  color: 'var(--text-primary)',
  letterSpacing: 0.4,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const warnStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: 'var(--status-warning-text)',
  background: 'var(--status-warning-bg)',
  border: '1px solid var(--status-warning-border)',
  borderRadius: 6,
  padding: '8px 10px',
  lineHeight: 1.45,
};