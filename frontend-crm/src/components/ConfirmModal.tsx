import React, { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

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
  const theme = useTheme();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const t = {
    bgCard: theme === 'dark' ? '#121217' : '#ffffff',
    border: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
    textMuted: theme === 'dark' ? '#a1a1aa' : '#475569',
    textBtnCancel: theme === 'dark' ? '#e4e4e7' : '#1e293b',
  };

  return (
    <div
      onClick={() => { if (!loading) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
        animation: 'confirmBackdropIn 0.2s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes confirmBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmModalIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: theme === 'dark'
            ? '0 24px 48px rgba(0, 0, 0, 0.6)'
            : '0 20px 40px rgba(0, 0, 0, 0.15)',
          animation: 'confirmModalIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: t.textTitle }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: t.textMuted }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'transparent',
              color: t.textBtnCancel,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}