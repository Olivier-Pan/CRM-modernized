import React, { useState, useEffect } from 'react';
import { getMembers, updateMemberRole, resetMemberPassword } from '../api/members';
import { getMe } from '../api/auth';
import type { Member, AuthUser } from '../types';
import { useTheme } from '../hooks/useTheme';

export default function TeamManagement() {
  const theme = useTheme();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Palette dynamique calquée à 100% sur Companies.tsx
  const t = {
    bgMain: theme === 'dark' ? '#09090b' : '#f8fafc',
    bgCard: theme === 'dark' ? '#121217' : '#ffffff',
    bgRowHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
    border: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
    textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
    textNormal: theme === 'dark' ? '#e4e4e7' : '#1e293b',
    textMuted: theme === 'dark' ? '#71717a' : '#475569',
    textSubMuted: theme === 'dark' ? '#a1a1aa' : '#64748b',
    btnHoverBg: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [meData, membersData] = await Promise.all([getMe(), getMembers()]);
        setCurrentUser(meData);
        setMembers(membersData);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement de l'équipe");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isAdmin = currentUser?.role === 'Admin';

  async function handleRoleChange(id: string, currentRole: string) {
    if (!isAdmin) return;
    const newRole = currentRole === 'Admin' ? 'Member' : 'Admin';
    if (!window.confirm(`Voulez-vous passer ce membre en ${newRole} ?`)) return;

    try {
      await updateMemberRole(id, newRole);
      setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
    } catch (err) {
      alert("Erreur lors de la mise à jour du rôle.");
    }
  }

  async function handlePasswordReset(id: string, name: string) {
    if (!isAdmin) return;
    const newPassword = window.prompt(`Entrez le nouveau mot de passe temporaire pour ${name} :`);
    
    if (!newPassword || newPassword.trim() === '') return;

    try {
      await resetMemberPassword(id, newPassword);
      alert(`Le mot de passe de ${name} a été réinitialisé avec succès !`);
    } catch (err) {
      alert("Erreur lors de la réinitialisation du mot de passe.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
        <div style={{ width: 16, height: 16, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Chargement de l'équipe...
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', padding: '16px 20px', borderRadius: 12, fontSize: 14 }}>
          <strong>Erreur :</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 44px', color: t.textNormal, maxWidth: 1400, margin: '0 auto', background: t.bgMain, minHeight: '100vh', transition: 'background 0.3s' }}>
      
      {/* En-tête (Layout calqué sur Companies.tsx) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Espace Admin
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textTitle, marginBottom: 6, letterSpacing: '-0.03em' }}>
          Gestion de l'équipe
        </h1>
        <p style={{ fontSize: 13, color: t.textSubMuted }}>
          {members.length} membre{members.length > 1 ? 's' : ''} dans le CRM
        </p>
      </div>

      {/* Carte contenant la liste (identique au tableau de Companies) */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.map((member, index) => (
            <div 
              key={member.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '20px 24px', 
                borderBottom: index === members.length - 1 ? 'none' : `1px solid ${t.border}`,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.bgRowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              
              {/* Infos Utilisateur (Gauche) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: '50%', 
                  background: member.role === 'Admin' ? 'linear-gradient(135deg, #8b5cf6, #f97316)' : (theme === 'dark' ? '#27272a' : '#e2e8f0'), 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  color: member.role === 'Admin' ? '#fff' : t.textMuted, 
                  fontWeight: 700, fontSize: 16
                }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: t.textTitle, fontSize: 15, marginBottom: 2 }}>
                    {member.name} 
                    {member.id === currentUser?.id && <span style={{ marginLeft: 8, fontSize: 11, color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.05em' }}>(VOUS)</span>}
                  </div>
                  <div style={{ color: t.textSubMuted, fontSize: 13 }}>{member.email}</div>
                </div>
              </div>

              {/* Rôle et Actions (Droite) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                
                {/* Badge de statut style CRM */}
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: member.role === 'Admin' ? 'rgba(139, 92, 246, 0.15)' : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  color: member.role === 'Admin' ? '#a78bfa' : t.textMuted,
                  border: `1px solid ${member.role === 'Admin' ? 'rgba(139, 92, 246, 0.3)' : t.border}`,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {member.role === 'Admin' ? 'Admin' : 'Membre'}
                </span>

                {/* Boutons réservés aux Admins */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleRoleChange(member.id, member.role)}
                      disabled={member.id === currentUser?.id} // On s'empêche de se rétrograder soi-même par erreur
                      style={{ 
                        background: 'transparent', border: `1px solid ${t.border}`, color: t.textNormal, 
                        padding: '8px 14px', borderRadius: 8, cursor: member.id === currentUser?.id ? 'not-allowed' : 'pointer', 
                        fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        opacity: member.id === currentUser?.id ? 0.3 : 1
                      }}
                      onMouseOver={(e) => { if (member.id !== currentUser?.id) e.currentTarget.style.background = t.btnHoverBg; }}
                      onMouseOut={(e) => { if (member.id !== currentUser?.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {member.role === 'Admin' ? 'Rétrograder' : 'Nommer Admin'}
                    </button>
                    
                    <button 
                      onClick={() => handlePasswordReset(member.id, member.name)}
                      style={{ 
                        background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', 
                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Nouveau Mdp
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}