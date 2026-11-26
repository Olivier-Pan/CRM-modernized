import { useEffect, useMemo, useRef, useState } from 'react';
import type { Company } from '../types';
import { copyText } from '../lib/clipboard';
import { buildMailtoUrl, defaultDeadline, isMailtoTooLong } from '../lib/exhibitorEmail';
import { MAIL_TEMPLATES, type MailTemplate } from '../lib/mailTemplates';

type CopyKind = 'login' | 'password' | 'both';

interface Props {
 company: Company;
 contactEmail?: string;
 editionName?: string;
 editionEventDate?: string;
 senderName?: string;
 /** Repli quand senderName est vide : le prenom vient de l'email. */
 senderEmail?: string;
 /** Date du dernier contact portee par le shark (modele de relance). */
 lastContactDate?: string;
 /** Renvoie true si la regeneration a reussi. Le parent gere l'API et l'alerte. */
 onRegenerate: () => Promise<boolean>;
 /** Ouvre le formulaire d'edition des infos (pour saisir l'email manquant). */
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
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<CopyKind | null>(null);
  // Initialiseur paresseux : le parent ne monte cette carte qu'apres chargement,
  // la date d'edition est donc deja definitive. Pas d'effet de resync qui
  // ecraserait une saisie manuelle du shark.
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
    MAIL_TEMPLATES.find((t) => t.id === templateId) || MAIL_TEMPLATES[0];

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
    [
      template,
      company,
      editionName,
      editionEventDate,
      senderName,
      senderEmail,
      deadline,
      lastContactDate,
    ]
  );

  const mailtoUrl = useMemo(
    () => buildMailtoUrl(contactEmail, mail),
    [contactEmail, mail]
  );

  const tooLong = isMailtoTooLong(mailtoUrl);

  async function handleCopy(kind: CopyKind, text: string) {
    const ok = await copyText(text);
    if (!ok) {
      alert('Copie impossible — sélectionnez le texte et copiez-le manuellement.');
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
      // On revele d'office : la seule raison de regenerer, c'est de renvoyer.
      setRevealed(true);
      setConfirmRegen(false);
      setCopied(null);
    }
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#0a0a0a',
            letterSpacing: '-0.01em',
          }}
        >
          Accès exposant
        </h2>
        <span
          aria-live="polite"
          style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', minHeight: 16 }}
        >
          {copied ? 'Copié !' : ''}
        </span>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 12, color: '#aaa' }}>
        Identifiants de connexion au portail d'inscription. À envoyer depuis ta boîte mail,
        jamais dans un canal public.
      </p>

      {/* Identifiant */}
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Identifiant</span>
        <code style={codeStyle}>{company.name}</code>
        <button type="button" onClick={() => handleCopy('login', company.name)} style={linkBtnStyle}>
          Copier
        </button>
      </div>

      {/* Mot de passe */}
      <div style={{ ...rowStyle, marginTop: 8 }}>
        <span style={rowLabelStyle}>Mot de passe</span>
        {hasPassword ? (
          <>
            <code style={codeStyle}>{revealed ? password : '••••••••'}</code>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
              style={linkBtnStyle}
            >
              {revealed ? 'Cacher' : 'Voir'}
            </button>
            <button
              type="button"
              onClick={() => handleCopy('password', password)}
              style={linkBtnStyle}
            >
              Copier
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy('both', `Identifiant : ${company.name}\nMot de passe : ${password}`)
              }
              style={linkBtnStyle}
            >
              Copier les deux
            </button>
          </>
        ) : (
          <span style={{ fontSize: 13, color: '#f97316' }}>
            Aucun mot de passe enregistré — régénérez-en un.
          </span>
        )}
      </div>

      {/* Modeles d'email */}
      <div style={{ marginTop: 22, borderTop: '1px solid #f0f0f0', paddingTop: 18 }}>
        <div style={labelStyle}>Modèle d'email</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {MAIL_TEMPLATES.map((t) => {
            const active = t.id === template.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                aria-pressed={active}
                title={t.hint}
                style={active ? chipActiveStyle : chipStyle}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>{template.hint}</div>
      </div>

      {/* Date limite */}
      <div style={{ marginTop: 18, maxWidth: 220 }}>
        <div style={labelStyle}>Date limite annoncée</div>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Avertissements */}
      {!contactEmail && (
        <div style={warnStyle}>
          Aucun email de contact enregistré : le brouillon s'ouvrira sans destinataire.{' '}
          <button type="button" onClick={onEditContact} style={inlineLinkStyle}>
            Ajouter l'email
          </button>
        </div>
      )}
      {mail.missing.length > 0 && (
        <div style={warnStyle}>À compléter dans le brouillon : {mail.missing.join(', ')}.</div>
      )}
      {tooLong && (
        <div style={warnStyle}>
          Message trop long pour un lien mailto : copiez les identifiants et rédigez l'email à la
          main.
        </div>
      )}

      {/* Actions */}
      <div
        style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}
      >
        {(!template.needsPassword || hasPassword) && !tooLong ? (
          <a
            href={mailtoUrl}
            style={{ ...btnPrimaryStyle, display: 'inline-block', textDecoration: 'none' }}
          >
            Ouvrir le brouillon
          </a>
        ) : (
          <span style={{ ...btnPrimaryStyle, opacity: 0.4, cursor: 'not-allowed' }}>
            Ouvrir le brouillon
          </span>
        )}

        {!confirmRegen && (
          <button type="button" onClick={() => setConfirmRegen(true)} style={btnDangerStyle}>
            Régénérer le mot de passe
          </button>
        )}
      </div>

      {/* Confirmation de regeneration */}
      {confirmRegen && (
        <div style={confirmStyle}>
          <div style={{ fontSize: 13, color: '#0a0a0a', fontWeight: 600, marginBottom: 4 }}>
            Régénérer le mot de passe de {company.name} ?
          </div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
            L'ancien mot de passe cessera immédiatement de fonctionner. Si l'entreprise est en
            train de remplir sa fiche, elle sera déconnectée. Tu devras lui renvoyer le nouveau
            mot de passe.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              style={btnDangerSolidStyle}
            >
              {regenerating ? 'Régénération…' : 'Oui, régénérer'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRegen(false)}
              disabled={regenerating}
              style={btnSecondaryStyle}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 0,
  border: '1px solid #e8e8e8',
  padding: 24,
  marginBottom: 16,
};
const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};
const rowLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  width: 110,
  flexShrink: 0,
};
const codeStyle: React.CSSProperties = {
  background: '#f5f5f5',
  padding: '4px 10px',
  borderRadius: 4,
  fontSize: 13,
  color: '#333',
  letterSpacing: 1,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};
const chipStyle: React.CSSProperties = {
  background: '#fff',
  color: '#555',
  border: '1px solid #e0e0e0',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle,
  background: '#0a0a0a',
  color: '#fff',
  borderColor: '#0a0a0a',
  fontWeight: 600,
};
const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#888',
  fontSize: 11,
  fontFamily: 'inherit',
  padding: '2px 4px',
};
const inlineLinkStyle: React.CSSProperties = {
  ...linkBtnStyle,
  color: '#0a0a0a',
  fontWeight: 600,
  textDecoration: 'underline',
  padding: 0,
};
const warnStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: '#92400e',
  background: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.25)',
  padding: '8px 12px',
  lineHeight: 1.6,
};
const confirmStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 16,
  border: '1px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.04)',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
  color: '#0a0a0a',
  fontFamily: 'inherit',
};
const btnPrimaryStyle: React.CSSProperties = {
  background: '#0a0a0a',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnSecondaryStyle: React.CSSProperties = {
  background: '#fff',
  color: '#555',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnDangerStyle: React.CSSProperties = {
  background: '#fff',
  color: '#ef4444',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnDangerSolidStyle: React.CSSProperties = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
