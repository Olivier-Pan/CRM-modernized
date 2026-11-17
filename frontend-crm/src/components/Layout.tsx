import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { useTheme, toggleTheme } from '../hooks/useTheme';
import { createCompany } from '../api/companies';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
}

interface NavItemProps {
  to?: string;
  onClick?: () => void;
  label: string;
  isActive: boolean;
  theme: 'dark' | 'light';
  isHighlighted?: boolean;
}

function NavItem({ to, onClick, label, isActive, theme, isHighlighted }: NavItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // --- STYLE DU BOUTON MIS EN VALEUR (Ajouter une entreprise) ---
  if (isHighlighted) {
    return (
      <button 
        onClick={onClick} 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)} 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '14px 16px',
          margin: '36px 12px 8px 12px',
          borderRadius: '10px',
          color: theme === 'dark' ? '#f3e8ff' : '#4c1d95',
          background: isHovered 
            ? (theme === 'dark' ? 'rgba(109, 40, 217, 0.7)' : 'rgba(109, 40, 217, 0.25)')
            : (theme === 'dark' ? 'rgba(109, 40, 217, 0.4)' : 'rgba(109, 40, 217, 0.12)'),
          border: `1px solid ${theme === 'dark' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.6)'}`,
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          width: 'calc(100% - 24px)',
          fontFamily: 'inherit',
          transform: isHovered ? 'translateY(-2px)' : 'none',
          boxShadow: isHovered 
            ? (theme === 'dark' ? '0 6px 16px rgba(109, 40, 217, 0.3)' : '0 6px 16px rgba(109, 40, 217, 0.25)') 
            : 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>+</span>
        {label}
      </button>
    );
  }

  // --- STYLE DES LIENS CLASSIQUES ---
  const t = {
    textActive: theme === 'dark' ? '#f97316' : '#ea580c',
    textHover: theme === 'dark' ? '#f4f4f5' : '#0f172a',
    textIdle: theme === 'dark' ? '#a1a1aa' : '#475569',
    bgActive: theme === 'dark' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(234, 88, 12, 0.08)',
    bgHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    dotActive: theme === 'dark' ? '#f97316' : '#ea580c',
    dotIdle: theme === 'dark' ? '#3f3f46' : '#cbd5e1',
  };

  const commonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    margin: '2px 12px',
    borderRadius: '8px',
    color: isActive ? t.textActive : isHovered ? t.textHover : t.textIdle,
    background: isActive ? t.bgActive : isHovered ? t.bgHover : 'transparent',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: 'calc(100% - 24px)',
    fontFamily: 'inherit',
    transform: isHovered && !isActive ? 'translateX(3px)' : 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const content = (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isActive ? t.dotActive : t.dotIdle,
          marginRight: '12px',
          flexShrink: 0,
          opacity: isActive || isHovered ? 1 : 0.4,
          transform: isActive ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease',
        }}
      />
      {label}
    </>
  );

  if (to) {
    return (
      <Link to={to} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={commonStyle}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={commonStyle}>
      {content}
    </button>
  );
}

export default function Layout({ children, userName, isAdmin }: LayoutProps) {
 const location = useLocation();
 const navigate = useNavigate();
 const theme = useTheme();
 const [logoutHovered, setLogoutHovered] = useState(false);
    // États de la Modal d'ajout d'entreprise
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const NAV_GROUPS = [
   {
     label: 'Aperçu',
     items: [{ to: '/dashboard', label: 'Dashboard' }],
   },
   {
     label: 'Prospection',
     items: [
       { to: '/companies', label: 'Toutes les entreprises' },
       { to: '/my-companies', label: 'Mes entreprises' },
     ],
   },
   {
     label: 'Compte',
     items: [
       { to: '/profile', label: 'Mon profil' },
       { id: 'add-company', label: 'Ajouter une entreprise' },
       // Only add the Team link if the user is an admin
       ...(isAdmin ? [{ to: '/team', label: "Gérer l'équipe" }] : []),
     ],
   },
 ];
 
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newCompany = await createCompany({ 
        name: newCompanyName.trim(), 
        edition_id: 'novatech_2027' // Ajuste selon l'ID exact de ton édition côté backend
      });
      
      setIsAddModalOpen(false);
      setNewCompanyName('');
      
      navigate(`/companies/${newCompany.id}?edit=true`);
    } catch (error) {
      console.error('Erreur lors de la création de l\'entreprise:', error);
      alert('Une erreur est survenue lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Palette dynamique du Layout
  const t = {
    sidebarBg: theme === 'dark' ? '#0a0a0f' : '#ffffff',
    mainBg: theme === 'dark' ? '#09090b' : '#f8fafc',
    border: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
    titleGroup: theme === 'dark' ? '#71717a' : '#475569',
    textMuted: theme === 'dark' ? '#a1a1aa' : '#475569',
    userBg: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
    logoFilter: theme === 'dark' ? 'brightness(1.1)' : 'invert(1) opacity(0.8)',
    haloViolet: theme === 'dark' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.12)',
    haloOrange: theme === 'dark' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.08)',
    haloPink: theme === 'dark' ? 'rgba(192, 38, 211, 0.15)' : 'rgba(192, 38, 211, 0.08)',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <aside style={{ width: 250, background: t.sidebarBg, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${t.border}`, position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}>
        
        <style>
          {`
            @keyframes fluidMotion1 { 0%, 100% { transform: translate(-10%, -10%) scale(1); } 50% { transform: translate(5%, 15%) scale(1.1); } }
            @keyframes fluidMotion2 { 0%, 100% { transform: translate(10%, 20%) scale(1.05); } 50% { transform: translate(-15%, 5%) scale(0.95); } }
            @keyframes fluidMotion3 { 0%, 100% { transform: translate(0%, -15%) scale(0.9); } 50% { transform: translate(-10%, 20%) scale(1.1); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          `}
        </style>
        
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle at center, ${t.haloViolet} 0%, transparent 65%)`, filter: 'blur(60px)', animation: 'fluidMotion1 12s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-50%', right: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle at center, ${t.haloOrange} 0%, transparent 65%)`, filter: 'blur(60px)', animation: 'fluidMotion2 14s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: '-25%', left: '-25%', width: '150%', height: '150%', background: `radial-gradient(circle at center, ${t.haloPink} 0%, transparent 70%)`, filter: 'blur(60px)', animation: 'fluidMotion3 10s ease-in-out infinite' }} />
        </div>

        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${t.border}`, position: 'relative', zIndex: 1 }}>
          <img src="/genius-logo.png" alt="Genius" style={{ maxHeight: 118, width: 'auto', display: 'block', marginBottom: 10, filter: t.logoFilter, transition: 'filter 0.3s' }} />
        </div>

        <nav style={{ flex: 1, padding: '20px 0', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ padding: '0 24px 8px', fontSize: 10, fontWeight: 700, color: t.titleGroup, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = item.to ? (location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to))) : false;
                return (
                  <NavItem 
                    key={item.to || item.id} 
                    to={item.to} 
                    onClick={item.id === 'add-company' ? () => setIsAddModalOpen(true) : undefined}
                    label={item.label} 
                    isActive={isActive} 
                    theme={theme} 
                    isHighlighted={item.id === 'add-company'}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: `1px solid ${t.border}`, position: 'relative', zIndex: 1, background: t.userBg }}>
          {userName && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#ffffff', marginRight: 10, flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: theme === 'dark' ? '#dddddd' : '#334155', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {userName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: t.textMuted }}>Connecté</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'}
              style={{
                background: 'transparent',
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                fontSize: 16,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              onClick={logout}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                flex: 1,
                background: logoutHovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                border: `1px solid ${logoutHovered ? 'rgba(239, 68, 68, 0.3)' : t.border}`,
                color: logoutHovered ? '#ef4444' : t.textMuted,
                padding: '0 14px',
                height: 36,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, background: t.mainBg, overflowY: 'auto', transition: 'background 0.3s' }}>
        {children}
      </main>

      {/* FAB - Floating Action Button fixe en bas à droite */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        title="Ajouter une entreprise"
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #f97316)',
          color: '#ffffff',
          border: 'none',
          boxShadow: theme === 'dark' ? '0 8px 24px rgba(249, 115, 22, 0.3)' : '0 8px 24px rgba(249, 115, 22, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 300,
          zIndex: 40,
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 14px 28px rgba(249, 115, 22, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = theme === 'dark' ? '0 8px 24px rgba(249, 115, 22, 0.3)' : '0 8px 24px rgba(249, 115, 22, 0.4)';
        }}
      >
        +
      </button>

      {/* Popup / Modal d'ajout d'entreprise */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {/* Arrière-plan assombri cliquable */}
          <div 
            onClick={() => !isSubmitting && setIsAddModalOpen(false)} 
            style={{ position: 'absolute', inset: 0, background: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }} 
          />

          {/* Fenêtre de la Popup */}
          <div style={{ position: 'relative', background: t.sidebarBg, border: `1px solid ${t.border}`, borderRadius: 16, width: '100%', maxWidth: 420, padding: 32, boxShadow: theme === 'dark' ? '0 24px 48px rgba(0,0,0,0.5)' : '0 24px 48px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            <h2 style={{ fontSize: 20, fontWeight: 700, color: theme === 'dark' ? '#fff' : '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Nouvelle entreprise
            </h2>
            <p style={{ fontSize: 14, color: t.textMuted, margin: '0 0 24px 0' }}>
              Saisissez le nom de la nouvelle entreprise à ajouter à la base de prospection.
            </p>

            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <input
                  type="text"
                  autoFocus
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nom de l'entreprise (ex: Google, ActiveViam...)"
                  disabled={isSubmitting}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: theme === 'dark' ? '#09090b' : '#f8fafc',
                    border: `1px solid ${t.border}`,
                    borderRadius: 10, padding: '14px 16px',
                    color: theme === 'dark' ? '#fff' : '#0f172a',
                    fontSize: 14, outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.boxShadow = theme === 'dark' ? '0 0 0 3px rgba(139, 92, 246, 0.15)' : '0 0 0 3px rgba(139, 92, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = t.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px', borderRadius: 8, background: 'transparent',
                    border: `1px solid ${t.border}`, color: t.textMuted,
                    fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={!newCompanyName.trim() || isSubmitting}
                  style={{
                    padding: '10px 24px', borderRadius: 8,
                    background: (!newCompanyName.trim() || isSubmitting) ? (theme === 'dark' ? '#27272a' : '#e2e8f0') : '#8b5cf6',
                    color: (!newCompanyName.trim() || isSubmitting) ? (theme === 'dark' ? '#52525b' : '#94a3b8') : '#fff',
                    border: 'none', fontSize: 14, fontWeight: 600, cursor: (!newCompanyName.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                    boxShadow: (!newCompanyName.trim() || isSubmitting) ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center'
                  }}
                >
                  {isSubmitting ? 'Ajout en cours...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}