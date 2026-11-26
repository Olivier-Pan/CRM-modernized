import { Link } from 'react-router-dom';
import { logout } from '../../api/auth';
import { useTheme, toggleTheme } from '../../hooks/useTheme';

interface MobileNavDrawerProps {
  navItems: Array<{ to: string; label: string }>;
  isNavActive: (to: string) => boolean;
  userName?: string;
}

export default function MobileNavDrawer({ navItems, isNavActive, userName }: MobileNavDrawerProps) {
  const theme = useTheme();

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-strong)',
        padding: '10px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: 'var(--shadow-popover)',
      }}
    >
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`crm-nav-link ${isNavActive(item.to) ? 'crm-nav-link--active' : ''}`}
        >
          {item.label}
        </Link>
      ))}

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />

      <Link to="/profile" className="crm-nav-link">
        Mon profil ({userName || 'Compte'})
      </Link>
      <button type="button" onClick={toggleTheme} className="crm-dropdown-item">
        {theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      </button>
      <button type="button" onClick={logout} className="crm-dropdown-item crm-dropdown-item--danger">
        Déconnexion
      </button>
    </div>
  );
}