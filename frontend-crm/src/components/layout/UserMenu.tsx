import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { logout } from '../../api/auth';
import { useTheme, toggleTheme } from '../../hooks/useTheme';
import { useClickOutside } from '../../hooks/useClickOutside';
import { IconChevronDown, IconLogOut, IconMoon, IconSun, IconUser } from '../ui/Icons';

interface UserMenuProps {
  userName?: string;
}

export default function UserMenu({ userName }: UserMenuProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setOpen(false), open);

  const initials = (userName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <div className="crm-desktop-only" style={{ position: 'relative' }} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu utilisateur"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 32,
          padding: '0 8px 0 4px',
          borderRadius: 6,
          border: '1px solid var(--border-subtle)',
          background: open ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-primary)',
          fontSize: 12.5,
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-strong)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {initials}
        </span>
        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userName || 'Compte'}
        </span>
        <IconChevronDown size={12} color="var(--text-tertiary)" />
      </button>

      {open && (
        <div
          className="crm-dropdown"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 205, zIndex: 80 }}
        >
          <Link to="/profile" onClick={() => setOpen(false)} className="crm-dropdown-item">
            <IconUser size={14} />
            <span>Mon profil</span>
          </Link>

          <button type="button" onClick={toggleTheme} className="crm-dropdown-item">
            {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
            <span>{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
          </button>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

          <button type="button" onClick={logout} className="crm-dropdown-item crm-dropdown-item--danger">
            <IconLogOut size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  );
}