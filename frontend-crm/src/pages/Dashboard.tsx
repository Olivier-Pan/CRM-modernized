import { useState, useEffect } from 'react';
import { listCompanies } from '../api/companies';
import { listSharks, getMySharks } from '../api/sharks';
import { listMembers } from '../api/members';
import type { Company, Shark, SharkStatus, Member } from '../types';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { getLogs, ActivityLog } from '../api/logs';
import { listFollowUps, FollowUp } from '../api/follow_ups'; 
import { useNavigate } from 'react-router-dom';
import { getMe } from '../api/auth';

const STATUS_ORDER: SharkStatus[] = [
 'Signed', 'VerbalAgreement', 'InDiscussion', 'Contacted',
  'ToContact', 'NoAnswer', 'Refused',
];

const GOAL = 20;

export default function Dashboard() {
 const theme = useTheme();
 const [companies, setCompanies] = useState<Company[]>([]);
 const [sharks, setSharks] = useState<Shark[]>([]);
 const [mySharks, setMySharks] = useState<Shark[]>([]);
 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [logs, setLogs] = useState<ActivityLog[]>([]);
 const navigate = useNavigate(); 
const [myFollowUps, setMyFollowUps] = useState<FollowUp[]>([]); 

 const t = {
   bgMain: theme === 'dark' ? '#09090b' : '#f8fafc',
   bgCard: theme === 'dark' ? '#121217' : '#ffffff',
   border: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
   textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
   textNormal: theme === 'dark' ? '#e4e4e7' : '#1e293b',
   textMuted: theme === 'dark' ? '#71717a' : '#475569',
   textSubMuted: theme === 'dark' ? '#a1a1aa' : '#64748b',
   bgHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
   bgTrack: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
 };

 useEffect(() => {
  // 1. On charge tout, y compris TON profil (getMe)
  Promise.all([listCompanies(), listSharks(), listMembers(), getLogs(), getMe()])
    .then(async ([companiesData, sharksData, membersData, logsData, meData]) => {
      setCompanies(companiesData);
      setSharks(sharksData);
      setMembers(membersData);
      setLogs(logsData);

      // 2. INFAILLIBLE : On filtre tes requins localement
      const myFilteredSharks = sharksData.filter((s) => s.member_id === meData.id);
      setMySharks(myFilteredSharks);

      // 3. Récupérer les relances uniquement pour TES entreprises
      try {
        const uniqueCompanyIds = Array.from(new Set(myFilteredSharks.map(s => s.company_id)));
        const fupPromises = uniqueCompanyIds.map(id => listFollowUps(id).catch(() => []));
        const fupResults = await Promise.all(fupPromises);
        setMyFollowUps(fupResults.flat());
      } catch (e) {
        console.error("Erreur relances:", e);
      }
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

 if (loading) {
   return (
     <div style={{ padding: 48, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
       <div style={{ width: 16, height: 16, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
       Chargement des données…
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

 const byStatus = STATUS_ORDER.reduce<Record<SharkStatus, number>>((acc, s) => {
   acc[s] = companies.filter((c) => c.global_status === s).length;
   return acc;
 }, {} as Record<SharkStatus, number>);

 const signed = byStatus['Signed'];
 const verbalAgreement = byStatus['VerbalAgreement'];
 const inDiscussion = byStatus['InDiscussion'];
 const contacted = byStatus['Contacted'];
 const confirmed = signed + verbalAgreement;

const recent = [...companies]
  .sort((a, b) => {
    const dateA = a.updated_at || "";
    const dateB = b.updated_at || "";
    return dateB.localeCompare(dateA);
  })
  .slice(0, 50); // <-- Augmente la limite ici (ou supprime complètement le .slice)

 const memberStats = members.map((m) => ({
   member: m,
   count: sharks.filter((s) => s.member_id === m.id).length,
   signed: sharks.filter((s) => s.member_id === m.id && companies.find((c) => c.id === s.company_id)?.global_status === 'Signed').length,
 })).sort((a, b) => b.count - a.count);

 // --- NOUVEAU : CALCUL DE LA TO-DO LIST (Ultra-robuste) ---
type ToDoItem = { company: Company; diffDays: number };
const inDiscussionList: ToDoItem[] = [];
const waitingList: ToDoItem[] = [];
const toFollowUpList: ToDoItem[] = [];

const now = new Date().getTime();
const myCompanyIds = Array.from(new Set(mySharks.map(s => s.company_id)));
const myAssignedCompanies = myCompanyIds.map(id => companies.find(c => c.id === id)).filter(Boolean) as Company[];

// --- 🐛 DÉBUT DU DEBUG ---
console.log("=== DEBUG DASHBOARD ===");
console.log("1. Mes requins (Assignations) :", mySharks);
console.log("2. Mes entreprises assignées :", myAssignedCompanies);
console.log("3. Mes relances téléchargées :", myFollowUps);
// --- FIN DU DEBUG ---

myAssignedCompanies.forEach(company => {
  const compFups = myFollowUps.filter(f => f.company_id === company.id);
  
  let lastDate = new Date(company.updated_at || 0).getTime();
  let derivedStatus = company.global_status || 'ToContact'; // Par défaut, on considère qu'il faut contacter

  if (compFups.length > 0) {
      // 1. Trouver la date de TA dernière action
      compFups.sort((a, b) => new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime());
      const lastFup = compFups[compFups.length - 1];
      lastDate = new Date(lastFup.follow_up_date).getTime();
      
      // 2. Déduire le statut RÉEL à partir de tes relances
      if (lastFup.notes === 'Passé en discussion') derivedStatus = 'InDiscussion';
      else if (lastFup.notes === 'Abandonné') derivedStatus = 'NoAnswer';
      else derivedStatus = 'Contacted'; // S'il y a un historique classique, c'est contacté
  }

  // 3. Si le statut est terminal (Signé, Refusé, ou Abandonné), on le retire de la To-Do list
  if (['Signed', 'VerbalAgreement', 'Refused', 'NoAnswer'].includes(derivedStatus)) {
      return;
  }

  // 4. Calculer les jours d'inactivité
  const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

  // 5. Répartir dans les bonnes colonnes
  if (derivedStatus === 'InDiscussion') {
      inDiscussionList.push({ company, diffDays });
  } else if (derivedStatus === 'Contacted') {
      if (diffDays >= 7) {
          toFollowUpList.push({ company, diffDays }); // +7 jours : urgence
      } else {
          waitingList.push({ company, diffDays }); // -7 jours : on attend
      }
  } else {
      // S'il n'y a eu aucune action de ta part, ça va direct dans "À relancer"
      toFollowUpList.push({ company, diffDays });
  }
});
// -----------------------------------------

 return (
   <div style={{ padding: '36px 44px', color: t.textNormal, maxWidth: 1400, margin: '0 auto', background: t.bgMain, minHeight: '100vh', transition: 'background 0.3s' }}>
    
     {/* En-tête de page */}
     <div style={{ marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
       <div>
         <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: 999, marginBottom: 12 }}>
           <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
           <span style={{ fontSize: 10, fontWeight: 700, color: theme === 'dark' ? '#f97316' : '#ea580c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
             NovaTech 2027
           </span>
         </div>
         <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textTitle, letterSpacing: '-0.03em', margin: 0, transition: 'color 0.3s' }}>
           Suivi de prospection
         </h1>
         <p style={{ fontSize: 13, color: t.textSubMuted, margin: '6px 0 0' }}>
           Tableau de bord de l'avancement commercial et performance de l'équipe
         </p>
       </div>
     </div>

     {/* Cartes KPIs */}
     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, gap: 16 }}>
       <div style={{ width: '100%', maxWidth: 400 }}>
         <KpiCard label="Entreprises totales" value={companies.length} accentColor="#8b5cf6" theme={theme} textAlign="center" />
       </div>
       <div style={{ display: 'flex', width: '100%', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
         <div style={{ flex: '1 1 0', minWidth: 200 }}>
           <KpiCard label="Contactées" value={contacted} color={SHARK_STATUS_COLORS['Contacted'] || '#000000'} accentColor="#a855f7" theme={theme} />
         </div>
         <div style={{ flex: '1 1 0', minWidth: 200 }}>
           <KpiCard label="En discussion" value={inDiscussion} color={SHARK_STATUS_COLORS['InDiscussion'] || '#f97316'} accentColor="#f97316" theme={theme} />
         </div>
         <div style={{ flex: '1 1 0', minWidth: 200 }}>
           <KpiCard label="Accords verbaux / Signées" value={confirmed} color={SHARK_STATUS_COLORS['Signed'] || '#10b981'} accentColor="#10b981" theme={theme} />
         </div>
       </div>
     </div>

     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 28 }}>
    
    {/* NOUVEAU : MA TO-DO LIST PERSONNELLE */}
   <div style={{ marginBottom: 32 }}>
     <div style={{ fontSize: 13, fontWeight: 800, color: t.textTitle, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
       <span style={{ fontSize: 18 }}>🎯</span> Mon plan d'action
     </div>
    
     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
       {/* Colonne 1 : À relancer (Rouge) */}
       <ToDoColumn title="🚨 À relancer (+7j)" items={toFollowUpList} theme={theme} t={t} color="#ef4444" navigate={navigate} emptyText="Aucune relance urgente." />
      
       {/* Colonne 2 : En attente (Bleu) */}
       <ToDoColumn title="⏳ En attente de réponse" items={waitingList} theme={theme} t={t} color="#3b82f6" navigate={navigate} emptyText="Personne en attente." />
      
       {/* Colonne 3 : En discussion (Jaune) */}
       <ToDoColumn title="💬 En discussion" items={inDiscussionList} theme={theme} t={t} color="#eab308" navigate={navigate} emptyText="Aucune discussion en cours." />
     </div>
   </div>

      {/* VRAI Live Feed (Fil d'actualité) */}
      <div style={{ 
        background: t.bgCard, 
        border: `1px solid ${t.border}`, 
        borderRadius: 14, 
        padding: '26px 12px 26px 26px', // Espace pour la barre de scroll
        transition: 'background 0.3s',
        height: 450, // Hauteur stricte appliquée ici
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, flexShrink: 0 }}>
          Live Feed (Dernières actions)
        </div>
        
        {/* La liste scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {logs.length > 0 ? logs.map((log) => {
            const statusColor = SHARK_STATUS_COLORS[log.new_status as SharkStatus] || t.textMuted;
            return (
              <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {log.member_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, flex: 1 }}>
                  <strong style={{ color: t.textTitle }}>{log.member_name}</strong> a passé{' '}
                  <strong style={{ color: t.textNormal }}>{log.company_name}</strong> de{' '}
                  <span style={{ color: t.textSubMuted, fontStyle: 'italic' }}>
                    {SHARK_STATUS_LABELS[log.old_status as SharkStatus] || log.old_status}
                  </span> à{' '}
                  <span style={{ display: 'inline-block', color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}33`, padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginLeft: 4 }}>
                    {SHARK_STATUS_LABELS[log.new_status as SharkStatus] || log.new_status}
                  </span>
                  <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>{formatDate(log.created_at)}</div>
                </div>
              </div>
            );
          }) : (
            <div style={{ color: t.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucune action récente.</div>
          )}
        </div>
      </div>

      {/* Performances par membre */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 26, transition: 'background 0.3s' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
          Activité de l'équipe
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memberStats.filter((m) => m.count > 0).map(({ member, count, signed }) => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(249, 115, 22, 0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: t.textNormal, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.name}
              </div>
              <div style={{ fontSize: 12, color: t.textSubMuted }}>
                <span style={{ fontWeight: 600, color: t.textTitle }}>{count}</span> contact{count > 1 ? 's' : ''}
              </div>
              {signed > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: theme === 'dark' ? '#34d399' : '#059669', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '3px 8px', borderRadius: 999 }}>
                  {signed} signé{signed > 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
          {memberStats.every((m) => m.count === 0) && (
            <div style={{ color: t.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Aucune prospection enregistrée.
            </div>
          )}
        </div>
      </div>
    </div>

     {/* Activité récente (Liste des entreprises) */}
    <div style={{ 
      background: t.bgCard, 
      border: `1px solid ${t.border}`, 
      borderRadius: 14, 
      padding: '26px 12px 26px 26px', // Padding asymétrique pour la scrollbar
      marginBottom: 28, 
      transition: 'background 0.3s',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 550 // <-- Hauteur maximale : limite la boîte à ~10 éléments
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, flexShrink: 0 }}>
        Dernières mises à jour (Entreprises)
      </div>
      
      {/* Conteneur avec défilement automatique */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: 12 }}>
        {recent.map((company, idx) => {
          const statusColor = SHARK_STATUS_COLORS[company.global_status as SharkStatus] || t.textMuted;
          return (
            <div key={company.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 12px', borderTop: idx > 0 ? `1px solid ${t.border}` : 'none', borderRadius: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: statusColor, boxShadow: `0 0 8px ${statusColor}66` }} />
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: t.textTitle }}>
                {company.name}
              </div>
              {company.sector && (
                <div style={{ fontSize: 11, color: t.textSubMuted, background: t.bgHover, padding: '3px 8px', borderRadius: 6 }}>
                  {company.sector}
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}33`, padding: '3px 10px', borderRadius: 999 }}>
                {SHARK_STATUS_LABELS[company.global_status as SharkStatus]}
              </div>
              {/* minWidth augmenté à 130 pour s'adapter à la nouvelle date avec l'heure */}
              <div style={{ fontSize: 12, color: t.textMuted, minWidth: 130, textAlign: 'right' }}>
                {formatDate(company.updated_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>

     {/* Mes attributions */}
     {mySharks.length > 0 && (
       <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 26, transition: 'background 0.3s' }}>
         <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
           Mes entreprises attribuées ({mySharks.length})
         </div>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
           {mySharks.map((shark) => {
             const company = companies.find((c) => c.id === shark.company_id);
             const statusColor = SHARK_STATUS_COLORS[shark.status] || t.textMuted;
             return (
               <div key={shark.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 10 }}>
                 <div style={{ fontWeight: 600, fontSize: 13, color: t.textTitle }}>
                   {company?.name || shark.company_id}
                 </div>
                 <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}33`, padding: '3px 8px', borderRadius: 999 }}>
                   {SHARK_STATUS_LABELS[shark.status]}
                 </div>
               </div>
             );
           })}
         </div>
       </div>
     )}

   </div>
 );
}

function KpiCard({ label, value, sub, color, accentColor, theme, textAlign = 'left' }: { label: string; value: number; sub?: string; color?: string; accentColor?: string; theme: 'dark'|'light'; textAlign?: 'left' | 'center' }) {
 const [hovered, setHovered] = useState(false);
 const bg = theme === 'dark' ? '#121217' : '#ffffff';
 const border = theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
 const textTitle = theme === 'dark' ? '#ffffff' : '#0f172a';
 const textMuted = theme === 'dark' ? '#71717a' : '#475569';
 const textSub = theme === 'dark' ? '#a1a1aa' : '#64748b';

 return (
   <div
     onMouseEnter={() => setHovered(true)}
     onMouseLeave={() => setHovered(false)}
     style={{
       background: bg,
       border: `1px solid ${hovered && accentColor ? accentColor + '44' : border}`,
       borderRadius: 14,
       padding: '22px 22px 18px',
       position: 'relative',
       overflow: 'hidden',
       transition: 'all 0.2s ease',
       transform: hovered ? 'translateY(-2px)' : 'none',
       textAlign: textAlign,
     }}
   >
     {accentColor && (
       <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor, boxShadow: `0 0 10px ${accentColor}88` }} />
     )}
     <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
       {label}
     </div>
     <div style={{ fontSize: 36, fontWeight: 800, color: color || textTitle, letterSpacing: '-0.03em', lineHeight: 1 }}>
       {value}
     </div>
     {sub && <div style={{ fontSize: 12, color: textSub, marginTop: 8 }}>{sub}</div>}
   </div>
 );
}

function formatDate(iso: string): string {
 if (!iso) return '—';
 const date = new Date(iso);
 return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

// --- COMPOSANT : COLONNE TO-DO ---
function ToDoColumn({ title, items, theme, t, color, navigate, emptyText }: { title: string, items: any[], theme: 'dark'|'light', t: any, color: string, navigate: any, emptyText: string }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px', background: `${color}15`, borderBottom: `1px solid ${color}33`, fontSize: 13, fontWeight: 700, color: color }}>
        {title} ({items.length})
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {items.length > 0 ? items.map(({ company, diffDays }) => (
          <div
            key={company.id}
            onClick={() => navigate(`/companies/${company.id}`)}
            style={{
              padding: '12px', background: t.bgMain, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textTitle, marginBottom: 4 }}>{company.name}</div>
            <div style={{ fontSize: 11, color: t.textSubMuted }}>
              {diffDays === 0 ? "Action effectuée aujourd'hui" : 
               diffDays === 1 ? "Dernière action hier" : 
               company.global_status === 'ToContact' ? "Jamais contacté" : `Dernière action il y a ${diffDays} jours`}
            </div>
          </div>
        )) : (
          <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: t.textMuted, fontStyle: 'italic' }}>
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}