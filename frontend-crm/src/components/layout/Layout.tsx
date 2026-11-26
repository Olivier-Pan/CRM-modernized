import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AddCompanyModal from './AddCompanyModal';
import CommandPalette from './CommandPalette';
import UserMenu from './UserMenu';
import MobileNavDrawer from './MobileNavDrawer';
import { IconClose, IconMenu, IconPlus, IconSearch } from '../ui/Icons';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  userId?: string;
  isAdmin?: boolean;
}

export default function Layout({ children, userName, userId, isAdmin }: LayoutProps) {
  const location = useLocation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/companies', label: 'Entreprises' },
    ...(isAdmin ? [{ to: '/team', label: 'Équipe' }] : []),
  ];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  function isNavActive(to: string) {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <img
                src="/genius-logo.png"
                alt="Genius CentraleSupélec"
                style={{ height: 28, width: 'auto', display: 'block', filter: 'var(--logo-filter)' }}
              />
            </Link>

            <div className="crm-desktop-only" style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />

            <nav className="crm-nav-desktop crm-desktop-only" aria-label="Navigation principale">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`crm-nav-link ${isNavActive(item.to) ? 'crm-nav-link--active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="crm-search-trigger crm-desktop-only"
              title="Recherche rapide (Cmd+K)"
            >
              <IconSearch size={13} />
              <span>Rechercher…</span>
              <span className="crm-kbd">⌘K</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="crm-icon-btn crm-mobile-only"
              aria-label="Rechercher"
            >
              <IconSearch size={15} />
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="crm-btn crm-btn-primary crm-btn-sm"
            >
              <IconPlus size={13} />
              <span className="crm-desktop-only">Entreprise</span>
            </button>

            <UserMenu userName={userName} />

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="crm-icon-btn crm-mobile-only"
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <IconClose size={15} /> : <IconMenu size={15} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <MobileNavDrawer navItems={navItems} isNavActive={isNavActive} userName={userName} />
        )}
      </header>

      <main className="crm-main">{children}</main>

      <AddCompanyModal
        open={isAddModalOpen}
        userId={userId}
        onClose={() => setIsAddModalOpen(false)}
      />

      <CommandPalette
        open={isCommandOpen}
        isAdmin={isAdmin}
        onClose={() => setIsCommandOpen(false)}
        onOpenAddCompany={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}