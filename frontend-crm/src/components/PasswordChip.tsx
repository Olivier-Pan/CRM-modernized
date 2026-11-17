import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/clipboard';

interface Props {
  password?: string;
  revealed: boolean;
  onToggle: () => void;
  /** Utilise uniquement pour l'etiquette lecteur d'ecran. */
  companyName: string;
}

export default function PasswordChip({ password, revealed, onToggle, companyName }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const value = (password || '').trim();

  async function handleCopy() {
    const ok = await copyText(value);
    if (!ok) {
      alert('Copie impossible — ouvrez la fiche entreprise.');
      return;
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }

  if (!value) {
    return <span style={{ fontSize: 12, color: '#ccc' }}>Aucun mot de passe</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <code style={codeStyle}>{revealed ? value : '••••••••'}</code>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={revealed}
        aria-label={`${revealed ? 'Cacher' : 'Afficher'} le mot de passe de ${companyName}`}
        style={linkBtnStyle}
      >
        {revealed ? 'Cacher' : 'Voir'}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copier le mot de passe de ${companyName}`}
        style={linkBtnStyle}
      >
        Copier
      </button>
      <span
        aria-live="polite"
        style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', minWidth: 48 }}
      >
        {copied ? 'Copié !' : ''}
      </span>
    </span>
  );
}

const codeStyle: React.CSSProperties = {
  background: '#f5f5f5',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  color: '#333',
  letterSpacing: 1,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
