import { Link, useLocation } from 'react-router-dom';
import { clearToken } from '../api/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navLinks = [
    { to: '/members', label: 'Membres' },
    { to: '/companies', label: 'Entreprises' },
    { to: '/editions', label: 'Editions' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Geometric accent lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.4 }} preserveAspectRatio="none" viewBox="0 0 100 200">
          {[...Array(10)].map((_, i) => (
            <line key={i} x1={-20 + i * 14} y1="200" x2={20 + i * 14} y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          ))}
        </svg>
        <div style={{ position: 'absolute', bottom: 80, right: -20, width: 80, height: 80, border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Logo area */}
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid #1a1a1a', position: 'relative' }}>
          <img
            src="/genius-logo.png"
            alt="Genius"
            style={{ width: '100%', display: 'block', marginBottom: 10 }}
          />
          <div style={{ fontSize: 10, color: '#444', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Admin
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0', position: 'relative' }}>
          {navLinks.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 24px',
                  color: active ? '#fff' : '#555',
                  background: active ? '#1a1a1a' : 'transparent',
                  borderLeft: active ? '2px solid #fff' : '2px solid transparent',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: 'color 0.15s, background 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', position: 'relative' }}>
          <button
            onClick={() => { clearToken(); window.location.href = '/login'; }}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#555',
              padding: '7px 14px',
              borderRadius: 0,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Deconnexion
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: '#fafafa', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
