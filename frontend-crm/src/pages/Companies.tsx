import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listCompanies } from '../api/companies';
import { listSharks } from '../api/sharks';
import { listMembers } from '../api/members';
import type { Company, Shark, SharkStatus, Member, AuthUser } from '../types';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { getMe } from '../api/auth';

type SortKey = 'name' | 'created_at' | 'updated_at';

const ALL_STATUSES: SharkStatus[] = [
 'ToContact', 'Contacted', 'InDiscussion',
 'VerbalAgreement', 'Signed', 'Refused', 'NoAnswer',
];

const SORT_LABELS: Record<SortKey, string> = {
 updated_at: 'Dernière mise à jour',
 created_at: 'Date de création',
 name: 'Ordre alphabétique'
};

export default function Companies() {
 const theme = useTheme();
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 
 // Tri et Recherche
 const sortKey = (searchParams.get('sort') as SortKey) || 'updated_at';
 const searchQuery = searchParams.get('q') || '';
 
 // Statuts multiples
 const statusParam = searchParams.get('statuses');
 const selectedStatuses: SharkStatus[] = statusParam ? (statusParam.split(',') as SharkStatus[]) : [];

 const [companies, setCompanies] = useState<Company[]>([]);
 const [sharks, setSharks] = useState<Shark[]>([]);
 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
 const [sharkFilter, setSharkFilter] = useState<string>('all');

 // État du menu déroulant Custom
 const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
 const sortMenuRef = useRef<HTMLDivElement>(null);

 // Palette dynamique
 const t = {
   bgMain: theme === 'dark' ? '#09090b' : '#f8fafc',
   bgCard: theme === 'dark' ? '#121217' : '#ffffff',
   bgTableHead: theme === 'dark' ? '#18181f' : '#f1f5f9',
   bgRowHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
   border: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
   textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
   textNormal: theme === 'dark' ? '#e4e4e7' : '#1e293b',
   textMuted: theme === 'dark' ? '#71717a' : '#475569',
   textSubMuted: theme === 'dark' ? '#a1a1aa' : '#64748b',
   inputBg: theme === 'dark' ? '#09090b' : '#ffffff',
   menuBg: theme === 'dark' ? '#18181b' : '#ffffff',
 };

 // CORRECTION 1 : Restauration de la vraie fonction pour fermer le menu de tri
 useEffect(() => {
   function handleClickOutside(event: MouseEvent) {
     if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
       setIsSortMenuOpen(false);
     }
   }
   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // CORRECTION 2 : Un seul bloc de chargement des données
 useEffect(() => {
   setLoading(true);
   Promise.all([listCompanies(), listSharks(), listMembers(), getMe()])
     .then(([companiesRes, sharksRes, membersRes, meData]) => {
       setCompanies(companiesRes);
       setSharks(sharksRes);
       setMembers(membersRes);
       setCurrentUser(meData as AuthUser);
     })
     .catch((err) => setError(err.message))
     .finally(() => setLoading(false));
 }, []);

 function updateParam(key: string, value: string) {
   setSearchParams((prev) => {
     const next = new URLSearchParams(prev);
     if (value) next.set(key, value);
     else next.delete(key);
     return next;
   });
 }

 const toggleStatusFilter = (status: SharkStatus) => {
   let nextStatuses = [...selectedStatuses];
   if (nextStatuses.includes(status)) {
     nextStatuses = nextStatuses.filter(s => s !== status);
   } else {
     nextStatuses.push(status);
   }
   updateParam('statuses', nextStatuses.join(','));
 };

 const getCompanySharksNames = useCallback(
   (companyId: string) => {
     const companySharks = sharks.filter((s) => s.company_id === companyId);
     if (companySharks.length === 0) return '—';
     return companySharks
       .map(s => {
         const member = members.find(m => m.id === s.member_id);
         return member ? member.name : 'Inconnu';
       })
       .join(', ');
   },
   [sharks, members]
 );

const filtered = companies
  .filter((c) => {
    // Filtre Statut et Recherche
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(c.global_status as SharkStatus)) return false;
     if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
     
     // NOUVEAU : Filtre par Shark
     if (sharkFilter !== 'all') {
       const assignedShark = sharks.find(s => s.company_id === c.id);
       if (!assignedShark) return false;
       if (sharkFilter === 'me' && assignedShark.member_id !== currentUser?.id) return false;
       if (sharkFilter !== 'me' && assignedShark.member_id !== sharkFilter) return false;
     }

     return true;
   })
   .sort((a, b) => {
     if (sortKey === 'name') return a.name.localeCompare(b.name);
     if (sortKey === 'created_at') return b.created_at.localeCompare(a.created_at);
     if (sortKey === 'updated_at') return b.updated_at.localeCompare(a.updated_at);
     return 0;
   });

 if (loading) return (
   <div style={{ padding: 48, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
     <div style={{ width: 16, height: 16, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
     Chargement de la base de prospection…
     <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
   </div>
 );

 if (error) return (
   <div style={{ padding: 48 }}>
     <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', padding: '16px 20px', borderRadius: 12, fontSize: 14 }}>
       <strong>Erreur :</strong> {error}
     </div>
   </div>
 );

 return (
   <div style={{ padding: '36px 44px', color: t.textNormal, maxWidth: 1400, margin: '0 auto', background: t.bgMain, minHeight: '100vh', transition: 'background 0.3s' }}>
    
     {/* En-tête */}
     <div style={{ marginBottom: 28 }}>
       <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
         Prospection
       </div>
       <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textTitle, marginBottom: 6, letterSpacing: '-0.03em' }}>
         Base d'entreprises
       </h1>
       <p style={{ fontSize: 13, color: t.textSubMuted }}>
         {filtered.length} entreprise{filtered.length !== 1 ? 's' : ''} sur {companies.length} au total
       </p>
     </div>

     {/* Barre de recherche et filtres avancés */}
     <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
      
       {/* Recherche et Tri */}
       <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
         
         <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
           <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
           <input
             type="text"
             placeholder="Rechercher une entreprise (ex: ActiveViam)..."
             value={searchQuery}
             onChange={(e) => updateParam('q', e.target.value)}
             style={{
               width: '100%', boxSizing: 'border-box',
               padding: '10px 14px 10px 40px',
               border: `1px solid ${t.border}`,
               borderRadius: 8,
               fontSize: 14,
               background: t.inputBg,
               color: t.textNormal,
               outline: 'none',
               transition: 'border-color 0.2s',
             }}
             onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
             onBlur={(e) => e.currentTarget.style.borderColor = t.border}
           />
         </div>
        
         {/* Composant de Tri Custom */}
         <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={sortMenuRef}>
           <span style={{ fontSize: 13, color: t.textMuted, fontWeight: 600 }}>Trier par :</span>
          
           <button
             onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
             style={{
               display: 'flex', alignItems: 'center', gap: 10,
               padding: '10px 16px',
               border: `1px solid ${t.border}`,
               borderRadius: 8,
               background: isSortMenuOpen ? t.bgRowHover : t.inputBg,
               color: t.textTitle,
               fontSize: 13,
               fontWeight: 600,
               cursor: 'pointer',
               transition: 'all 0.2s',
             }}
           >
             {SORT_LABELS[sortKey]}
             <svg
               width="10" height="6" viewBox="0 0 10 6" fill="none"
               style={{
                 transform: isSortMenuOpen ? 'rotate(180deg)' : 'none',
                 transition: 'transform 0.2s ease'
               }}
             >
               <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           </button>

           {/* Liste déroulante volante */}
           {isSortMenuOpen && (
             <div
               style={{
                 position: 'absolute', top: '100%', right: 0, marginTop: 8,
                 width: 200, background: t.menuBg,
                 border: `1px solid ${t.border}`, borderRadius: 10,
                 boxShadow: theme === 'dark' ? '0 12px 24px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.1)',
                 zIndex: 50, overflow: 'hidden',
                 animation: 'fadeIn 0.15s ease'
               }}
             >
               {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => {
                 const isActive = sortKey === key;
                 return (
                   <button
                     key={key}
                     onClick={() => {
                       updateParam('sort', key);
                       setIsSortMenuOpen(false);
                     }}
                     style={{
                       display: 'block', width: '100%', textAlign: 'left',
                       padding: '10px 16px',
                       background: isActive ? (theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)') : 'transparent',
                       border: 'none',
                       color: isActive ? (theme === 'dark' ? '#a78bfa' : '#6d28d9') : t.textNormal,
                       fontSize: 13,
                       fontWeight: isActive ? 600 : 500,
                       cursor: 'pointer',
                     }}
                     onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.bgRowHover; }}
                     onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                   >
                     {label}
                   </button>
                 );
               })}
             </div>
           )}
         </div>
       </div>

       {/* Filtres par statuts multiples */}
       <div>
         <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
           Filtrer par statuts
         </div>
         <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
           {ALL_STATUSES.map((status) => {
             const isSelected = selectedStatuses.includes(status);
             const color = SHARK_STATUS_COLORS[status] || t.textMuted;
             return (
               <button
                 key={status}
                 onClick={() => toggleStatusFilter(status)}
                 style={{
                   padding: '6px 12px',
                   borderRadius: 999,
                   fontSize: 12,
                   fontWeight: 600,
                   cursor: 'pointer',
                   background: isSelected ? `${color}20` : 'transparent',
                   border: `1px solid ${isSelected ? color : t.border}`,
                   color: isSelected ? color : t.textSubMuted,
                   transition: 'all 0.2s ease',
                   display: 'flex',
                   alignItems: 'center',
                   gap: 6,
                 }}
               >
                 {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
                 {SHARK_STATUS_LABELS[status]}
               </button>
             );
           })}
           {selectedStatuses.length > 0 && (
             <button
               onClick={() => updateParam('statuses', '')}
               style={{
                 padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                 cursor: 'pointer', background: 'transparent', border: '1px dashed #ef4444', color: '#ef4444',
               }}
             >
               Réinitialiser
             </button>
           )}
         </div>
       </div>

       {/* NOUVEAU : Filtres par Responsable (Shark) */}
       <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border}` }}>
         <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
           Filtrer par responsable
         </div>
         <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          
           <button
             onClick={() => setSharkFilter(sharkFilter === 'me' ? 'all' : 'me')}
             style={{
               padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s',
               border: `1px solid ${sharkFilter === 'me' ? 'transparent' : t.border}`,
               background: sharkFilter === 'me' ? '#8b5cf6' : 'transparent',
               color: sharkFilter === 'me' ? '#ffffff' : t.textNormal,
             }}
           >
             <span>🦈</span> Mes attributions
           </button>

           <select
             value={sharkFilter === 'me' ? 'all' : sharkFilter}
             onChange={(e) => setSharkFilter(e.target.value)}
             style={{
               padding: '8px 12px', borderRadius: 8, fontSize: 13,
               background: t.inputBg, border: `1px solid ${t.border}`, color: t.textNormal,
               outline: 'none', cursor: 'pointer', minWidth: 200
             }}
           >
             <option value="all">Toute l'équipe (Aucun filtre)</option>
             {members.map(m => (
               <option key={m.id} value={m.id}>
                 {m.name} {m.id === currentUser?.id ? '(Moi)' : ''}
               </option>
             ))}
           </select>
         </div>
       </div>
     </div> {/* CORRECTION 3 : Cette balise </div> ferme correctement et proprement tout le bloc de recherche ! */}
    
     {/* Tableau des entreprises avec lignes cliquables */}
     <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
         <thead>
           <tr style={{ background: t.bgTableHead, borderBottom: `1px solid ${t.border}` }}>
             <th style={{ ...thStyle, color: t.textMuted }}>Entreprise</th>
             <th style={{ ...thStyle, color: t.textMuted }}>Statut</th>
             <th style={{ ...thStyle, color: t.textMuted }}>Sharks Associés</th>
           </tr>
         </thead>
         <tbody>
           {filtered.length === 0 && (
             <tr>
               <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
                 Aucune entreprise ne correspond à cette recherche.
               </td>
             </tr>
           )}
           {filtered.map((company) => (
             <tr
               key={company.id}
               onClick={() => navigate(`/companies/${company.id}`)}
               style={{
                 borderBottom: `1px solid ${t.border}`,
                 transition: 'background 0.15s ease',
                 cursor: 'pointer',
               }}
               onMouseEnter={(e) => (e.currentTarget.style.background = t.bgRowHover)}
               onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
             >
               <td style={tdStyle}>
                 <div style={{ fontWeight: 600, color: t.textTitle, marginBottom: 2 }}>{company.name}</div>
                 {company.sector && (
                   <div style={{ fontSize: 11, color: t.textSubMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                     {company.sector}
                   </div>
                 )}
               </td>
               <td style={tdStyle}>
                 <StatusBadge status={company.global_status} />
               </td>
               <td style={tdStyle}>
                 <span style={{ color: t.textNormal, fontWeight: 500 }}>
                   {getCompanySharksNames(company.id)}
                 </span>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   </div>
 );
}

function StatusBadge({ status }: { status: SharkStatus | string }) {
const s = status as SharkStatus;
const color = SHARK_STATUS_COLORS[s] || '#71717a';
return (
  <span style={{
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: `${color}15`,
    color: color,
    border: `1px solid ${color}33`,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }}>
    {SHARK_STATUS_LABELS[s] || status}
  </span>
);
}

const thStyle: React.CSSProperties = {
 padding: '14px 20px',
 textAlign: 'left',
 fontWeight: 700,
 fontSize: 11,
 letterSpacing: '0.08em',
 textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
 padding: '16px 20px',
 verticalAlign: 'middle'
};