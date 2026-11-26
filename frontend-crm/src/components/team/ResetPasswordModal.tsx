import { useEffect, useState, type FormEvent } from 'react';
import type { Member } from '../../types';
import { IconClose } from '../ui/Icons';

interface ResetPasswordModalProps {
  member: Member | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (newPassword: string) => Promise<void>;
}

export default function ResetPasswordModal({
  member,
  loading,
  onClose,
  onConfirm,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!member) return;
    setPassword('');
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [member, loading, onClose]);

  if (!member) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    await onConfirm(password.trim());
  }

  return (
    <div
      className="crm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-pwd-title"
      onClick={() => !loading && onClose()}
    >
      <div className="crm-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: '15px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 id="reset-pwd-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Réinitialiser le mot de passe
          </h3>
          <button type="button" onClick={onClose} disabled={loading} className="crm-icon-btn" aria-label="Fermer">
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Définis un nouveau mot de passe temporaire pour <strong>{member.name}</strong> ({member.email}).
          </p>

          <input
            type="text"
            autoFocus
            className="crm-input"
            placeholder="Nouveau mot de passe temporaire…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={loading} className="crm-btn crm-btn-secondary crm-btn-sm">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="crm-btn crm-btn-danger crm-btn-sm"
            >
              {loading ? 'Mise à jour…' : 'Réinitialiser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}