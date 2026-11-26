import { useEffect } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="crm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="crm-modal"
        style={{ maxWidth: 420, padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="confirm-modal-title"
          style={{
            margin: '0 0 8px',
            fontSize: 15.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="crm-btn crm-btn-danger crm-btn-sm"
          >
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}