import React from 'react';

export function getCompanyDetailTheme(theme: 'dark' | 'light') {
  return {
    bgMain: theme === 'dark' ? '#09090b' : '#f8fafc',
    bgCard: theme === 'dark' ? '#121217' : '#ffffff',
    bgHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
    border: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
    textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
    textNormal: theme === 'dark' ? '#e4e4e7' : '#1e293b',
    textMuted: theme === 'dark' ? '#71717a' : '#475569',
    textSubMuted: theme === 'dark' ? '#a1a1aa' : '#64748b',
    inputBg: theme === 'dark' ? '#09090b' : '#ffffff',
    primary: theme === 'dark' ? '#8b5cf6' : '#6d28d9',
  };
}

export type CompanyDetailTheme = ReturnType<typeof getCompanyDetailTheme>;

export function CompanyDetailStyles({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';

  return (
    <style>{`
      @keyframes crmStepIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .crm-timeline-item {
        animation: crmStepIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .crm-btn {
        transition: transform 0.14s cubic-bezier(0.2, 0, 0, 1),
                    background-color 0.16s ease,
                    border-color 0.16s ease,
                    box-shadow 0.16s ease,
                    color 0.16s ease;
        user-select: none;
      }

      .crm-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .crm-btn:active:not(:disabled) {
        transform: scale(0.97);
      }

      .crm-btn-primary {
        background: linear-gradient(180deg, #9366f9 0%, #7c3aed 100%);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 2px 10px rgba(124, 58, 237, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18);
      }

      .crm-btn-primary:hover:not(:disabled) {
        background: linear-gradient(180deg, #9d75fa 0%, #8b5cf6 100%);
        box-shadow: 0 6px 18px rgba(124, 58, 237, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.24);
      }

      .crm-btn-secondary {
        background: ${isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
        color: ${isDark ? '#e4e4e7' : '#1e293b'};
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)'};
      }

      .crm-btn-secondary:hover:not(:disabled) {
        background: ${isDark ? 'rgba(255, 255, 255, 0.07)' : '#f8fafc'};
        border-color: ${isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.22)'};
      }

      .crm-btn-amber {
        background: rgba(245, 158, 11, 0.1);
        color: ${isDark ? '#fbbf24' : '#d97706'};
        border: 1px solid rgba(245, 158, 11, 0.32);
      }

      .crm-btn-amber:hover:not(:disabled) {
        background: rgba(245, 158, 11, 0.18);
        border-color: rgba(245, 158, 11, 0.5);
      }

      .crm-btn-ghost-danger {
        background: ${isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
        color: ${isDark ? '#a1a1aa' : '#64748b'};
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.09)'};
      }

      .crm-btn-ghost-danger:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.32);
      }

      .crm-icon-btn {
        transition: transform 0.14s ease, background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }

      .crm-icon-btn:hover {
        background: ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} !important;
        border-color: ${isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.18)'} !important;
        color: ${isDark ? '#ffffff' : '#0f172a'} !important;
        transform: translateY(-1px);
      }

      .crm-icon-btn:active {
        transform: scale(0.94);
      }

      .crm-icon-btn-danger:hover {
        background: rgba(239, 68, 68, 0.12) !important;
        border-color: rgba(239, 68, 68, 0.35) !important;
        color: #ef4444 !important;
      }

      .crm-pill-action {
        transition: transform 0.14s ease, background-color 0.15s ease, border-color 0.15s ease;
      }

      .crm-pill-action:hover {
        border-color: rgba(139, 92, 246, 0.45) !important;
        background: ${isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(109, 40, 217, 0.05)'} !important;
      }

      .crm-pill-action:active {
        transform: scale(0.97);
      }
    `}</style>
  );
}

export function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
}

export const tagStyle = (theme: 'dark' | 'light'): React.CSSProperties => ({
  display: 'inline-block',
  padding: '6px 14px',
  background: theme === 'dark' ? '#18181b' : '#f1f5f9',
  borderRadius: 999,
  fontSize: 12,
  color: theme === 'dark' ? '#a1a1aa' : '#475569',
  fontWeight: 600,
  border: `1px solid ${theme === 'dark' ? '#27272a' : '#e2e8f0'}`,
});

export const labelStyle = (color: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 700,
  color,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

export const inputStyle = (t: CompanyDetailTheme): React.CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: `1px solid ${t.border}`,
  borderRadius: 8,
  fontSize: 14,
  background: t.inputBg,
  color: t.textNormal,
  outline: 'none',
  fontFamily: 'inherit',
});

export const btnPrimaryStyle: React.CSSProperties = {
  background: '#8b5cf6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const btnSecondaryStyle = (t: CompanyDetailTheme): React.CSSProperties => ({
  background: 'transparent',
  color: t.textNormal,
  border: `1px solid ${t.border}`,
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
});