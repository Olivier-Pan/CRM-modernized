import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompany, updateCompany, updateInternalRemark, regenerateCompanyPassword } from '../api/companies';
import { listCompanyContacts, createContact, updateContact, deleteContact } from '../api/contacts';
import { listSharks, assignShark, deleteShark } from '../api/sharks';
import { listFollowUps, createFollowUp, deleteFollowUp, updateFollowUp, FollowUp } from '../api/follow_ups';
import { getMe } from '../api/auth';
import { deleteCompany } from '../api/companies';
import { listMembers } from '../api/members';
import { listEditions } from '../api/editions';
import { ApiError } from '../api/client';
import ExhibitorAccessCard from '../components/ExhibitorAccessCard';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../hooks/useTheme';
import type { Company, Shark, SharkStatus, AuthUser, Member, Edition, Contact, ContactType } from '../types';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../types';


const ALL_STATUSES: SharkStatus[] = [
 'ToContact', 'Contacted', 'InDiscussion', 'VerbalAgreement', 'Signed', 'Refused', 'NoAnswer',
];

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
 person: 'Personne physique',
 generic_email: 'Email générique',
 company_linkedin: 'Page LinkedIn',
 website_form: 'Formulaire site web'
};

export default function CompanyDetail() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const theme = useTheme();

 // --- ÉTATS GLOBAUX ---
 const [company, setCompany] = useState<Company | null>(null);
 const [contacts, setContacts] = useState<Contact[]>([]);
 const [sharks, setSharks] = useState<Shark[]>([]);
 const [followUps, setFollowUps] = useState<FollowUp[]>([]);
 const [me, setMe] = useState<AuthUser | null>(null);
 const [members, setMembers] = useState<Member[]>([]);
 const [editions, setEditions] = useState<Edition[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 // --- ÉDITION IDENTITÉ ---
 const [editingInfo, setEditingInfo] = useState(false);
 const [editInfo, setEditInfo] = useState({
   name: '', logo_url: '', sector: '', size: '', website: '', description: '',
   legal_name: '', novatech_offer: '' as '' | 'oui' | 'non', forum_contract_date: '',
 });

 const [savingInfo, setSavingInfo] = useState(false);
const [confirmDialog, setConfirmDialog] = useState<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
} | null>(null);
const [confirmLoading, setConfirmLoading] = useState(false);
const [deletingCompany, setDeletingCompany] = useState(false);
 
// --- GESTION CONTACTS ---
const [showAddContact, setShowAddContact] = useState(false);
const [newContact, setNewContact] = useState({
  contact_type: 'person' as ContactType, first_name: '', last_name: '', email: '', phone: '', linkedin_url: '', is_primary: false
});
const [savingContact, setSavingContact] = useState(false);
const [editingContactId, setEditingContactId] = useState<string | null>(null);
const [editContactForm, setEditContactForm] = useState({
  contact_type: 'person' as ContactType,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  linkedin_url: '',
});
const [savingEditContact, setSavingEditContact] = useState(false);

 // --- GESTION RELANCES (FOLLOW-UPS) ---
 const [editingFollowUpsId, setEditingFollowUpsId] = useState<string | null>(null);

 // --- REMARQUE INTERNE ---
 const [editingRemark, setEditingRemark] = useState(false);
 const [remarkDraft, setRemarkDraft] = useState('');
 const [remarkBase, setRemarkBase] = useState('');
 const [remarkConflict, setRemarkConflict] = useState<string | null>(null);
 const [savingRemark, setSavingRemark] = useState(false);

 // --- GESTION MENU STATUT CUSTOM ---
 const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
 const statusMenuRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
      setIsStatusMenuOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const t = {
   bgMain: theme === 'dark' ? '#09090b' : '#f8fafc',
   bgCard: theme === 'dark' ? '#121217' : '#ffffff',
   bgHover: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
   border: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
   textTitle: theme === 'dark' ? '#ffffff' : '#0f172a',
   textNormal: theme === 'dark' ? '#e4e4e7' : '#1e293b',
   textMuted: theme === 'dark' ? '#71717a' : '#475569',
   textSubMuted: theme === 'dark' ? '#a1a1aa' : '#64748b',
   inputBg: theme === 'dark' ? '#09090b' : '#ffffff',
   primary: theme === 'dark' ? '#8b5cf6' : '#6d28d9',
 };

 useEffect(() => {
   if (!id) return;
   setLoading(true);
   Promise.all([
     getCompany(id),
     listCompanyContacts(id),
     listSharks(id),
     listFollowUps(id),
     getMe(),
     listMembers(),
     listEditions().catch(() => [] as Edition[]),
   ])
     .then(([companyRes, contactsRes, sharksRes, followUpsRes, meRes, membersRes, editionsRes]) => {
       setCompany(companyRes);
       setContacts(contactsRes);
       setSharks(sharksRes);
       setFollowUps(followUpsRes);
       setMe(meRes as AuthUser);
       setMembers(membersRes);
       setEditions(editionsRes);
     })
     .catch((err) => setError(err.message))
     .finally(() => setLoading(false));
 }, [id]);

 async function handleGlobalStatusChange(newStatus: SharkStatus) {
   if (!id || !company) return;
   if (newStatus === 'InDiscussion' && contacts.length === 0) {
     alert("L'entreprise passe en discussion : veuillez d'abord ajouter un contact !");
     return;
   }
   try {
     const updated = await updateCompany(id, { global_status: newStatus });
     setCompany(updated);
   } catch (err) {
     alert(err instanceof Error ? err.message : 'Erreur');
   }
 }

 function startEditInfo() {
   if (!company) return;
   setEditInfo({
     name: company.name || '', logo_url: company.logo_url || '', sector: company.sector || '',
     size: company.size || '', website: company.website || '', description: company.description || '',
     legal_name: company.legal_name || '', novatech_offer: company.novatech_offer == null ? '' : company.novatech_offer ? 'oui' : 'non',
     forum_contract_date: company.forum_contract_date || '',
   });
   setEditingInfo(true);
 }

 async function saveInfo() {
   if (!id || !company) return;
   setSavingInfo(true);
   try {
     const updated = await updateCompany(id, {
       name: editInfo.name, logo_url: editInfo.logo_url, sector: editInfo.sector,
       size: editInfo.size, website: editInfo.website, description: editInfo.description,
     });
     setCompany(updated);
     setEditingInfo(false);
   } catch (err) {
     alert(err instanceof Error ? err.message : 'Erreur');
   } finally {
     setSavingInfo(false);
   }
 }

function handleDeleteCompany() {
  if (!id || !company) return;
  setConfirmDialog({
    title: "Supprimer l'entreprise",
    message: `Êtes-vous sûr de vouloir supprimer définitivement « ${company.name} » ainsi que tous ses contacts et relances ? Cette action est irréversible.`,
    confirmLabel: 'Supprimer définitivement',
    onConfirm: async () => {
      await deleteCompany(id);
      navigate('/companies', { replace: true });
    },
  });
}
 async function handleAddContact(e: React.FormEvent) {
   e.preventDefault();
   if (!id) return;
   setSavingContact(true);
   try {
     const is_primary = newContact.is_primary || contacts.length === 0;
     const created = await createContact(id, { ...newContact, is_primary });
     setContacts([...contacts, created]);
     setShowAddContact(false);
     setNewContact({ contact_type: 'person', first_name: '', last_name: '', email: '', phone: '', linkedin_url: '', is_primary: false });
   } catch (err) {
     alert(err instanceof Error ? err.message : 'Erreur');
   } finally {
     setSavingContact(false);
   }
 }

function handleDeleteContact(contactId: string) {
  setConfirmDialog({
    title: 'Supprimer le contact',
    message: 'Êtes-vous sûr de vouloir supprimer définitivement ce contact ?',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setSharks((prev) => prev.filter((s) => s.contact_id !== contactId));
    },
  });
}

async function handleSetPrimaryContact(contactId: string) {
  try {
    await updateContact(contactId, { is_primary: true });
    const updatedContacts = await listCompanyContacts(id!);
    setContacts(updatedContacts);
  } catch (err) {
    alert("Erreur lors de la mise à jour du contact principal.");
  }
}

function startEditContact(contact: Contact) {
  setEditingContactId(contact.id);
  setEditContactForm({
    contact_type: contact.contact_type,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    linkedin_url: contact.linkedin_url || '',
  });
}

async function handleSaveEditContact(e: React.FormEvent, contactId: string) {
  e.preventDefault();
  setSavingEditContact(true);
  try {
    const updated = await updateContact(contactId, {
      contact_type: editContactForm.contact_type,
      first_name: editContactForm.contact_type === 'person' ? editContactForm.first_name : '',
      last_name: editContactForm.contact_type === 'person' ? editContactForm.last_name : '',
      email: editContactForm.email,
      phone: editContactForm.phone,
      linkedin_url: editContactForm.linkedin_url,
    });
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    setEditingContactId(null);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Erreur lors de la modification du contact');
  } finally {
    setSavingEditContact(false);
  }
}

 async function handleAssignShark(contactId: string, targetMemberId: string) {
   if (!id) return;
   try {
     const shark = await assignShark({ company_id: id, contact_id: contactId, member_id: targetMemberId, contact_method: 'Email' });
     setSharks([...sharks, shark]);
   } catch (err) {
     alert(err instanceof Error ? err.message : 'Erreur');
   }
 }

function handleUnassignShark(sharkId: string) {
  setConfirmDialog({
    title: 'Se désassigner',
    message: 'Voulez-vous vraiment vous désassigner de ce contact ?',
    confirmLabel: 'Se désassigner',
    onConfirm: async () => {
      await deleteShark(sharkId);
      setSharks((prev) => prev.filter((s) => s.id !== sharkId));
    },
  });
}

 // --- ACTIONS DE RELANCE DYNAMIQUES ---
 async function handleAddFollowUp(contactId: string, customNote?: string) {
   if (!id || !me) return;
   try {
     const today = new Date().toISOString().split('T')[0];
     const newFup = await createFollowUp(id, {
       member_id: me.id,
       contact_id: contactId,
       follow_up_date: today,
       method: 'Email',
       notes: customNote // <-- Permet de stocker "Passé en discussion" ou "Abandonné"
     });
     setFollowUps([...followUps, newFup]);

     // Passage automatique en 'Contacted' si c'est le 1er contact classique
     if (company?.global_status === 'ToContact' && !customNote) {
       handleGlobalStatusChange('Contacted');
     }
   } catch (err) {
     alert(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de la relance');
   }
 }

 async function handleUpdateFollowUpDate(fupId: string, newDate: string) {
   if (!id) return;
   try {
     const updated = await updateFollowUp(id, fupId, newDate);
     setFollowUps((prev) => prev.map(f => f.id === fupId ? updated : f));
   } catch (err) {
     alert(err instanceof Error ? err.message : "Erreur de modification");
   }
 }

function handleDeleteFollowUp(fupId: string) {
  if (!id) return;
  setConfirmDialog({
    title: "Supprimer l'entrée",
    message: 'Êtes-vous sûr de vouloir supprimer cette entrée de suivi ?',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await deleteFollowUp(id, fupId);
      setFollowUps((prev) => prev.filter((f) => f.id !== fupId));
    },
  });
}

 async function handleCancelStatus(contactId: string, statusType: 'InDiscussion' | 'NoAnswer') {
   if (!id) return;
   const logNote = statusType === 'InDiscussion' ? 'Passé en discussion' : 'Abandonné';
   
   // On cherche LA DERNIÈRE relance exacte qui correspond à ce statut pour ce contact
   const contactLogs = followUps.filter(f => f.contact_id === contactId && f.notes === logNote);
   const log = contactLogs[contactLogs.length - 1]; 

   try {
     if (log) {
       await deleteFollowUp(id, log.id);
       setFollowUps(prev => prev.filter(f => f.id !== log.id));
     }
     await handleGlobalStatusChange('Contacted'); 
   } catch (err) {
     alert(err instanceof Error ? err.message : "Erreur d'annulation");
   }
 }


 function startEditRemark() {
   if (!company) return;
   const current = company.internal_remark ?? '';
   setRemarkBase(current);
   setRemarkDraft(current);
   setRemarkConflict(null);
   setEditingRemark(true);
 }

 async function saveRemark() {
   if (!id || !company) return;
   if (remarkDraft.trim() === remarkBase.trim()) {
     setEditingRemark(false);
     return;
   }
   setSavingRemark(true);
   try {
     const updated = await updateInternalRemark(id, remarkDraft, remarkBase);
     setCompany(updated);
     setEditingRemark(false);
   } catch (err) {
     if (err instanceof ApiError && err.status === 409) {
       const body = err.body as { current_internal_remark?: string } | null;
       const current = body?.current_internal_remark ?? '';
       setRemarkBase(current);
       setRemarkConflict(current);
     } else {
       alert(err instanceof Error ? err.message : 'Erreur');
     }
   } finally {
     setSavingRemark(false);
   }
 }

 if (loading) return (
   <div style={{ padding: 48, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
     <div style={{ width: 16, height: 16, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
     Chargement de la fiche entreprise…
     <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
   </div>
 );
 if (error || !company) return <div style={{ padding: 40, color: '#ef4444' }}>Erreur : {error || "Entreprise introuvable"}</div>;

 const sortedContacts = [...contacts].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

 return (
   <div style={{ padding: '36px 44px', color: t.textNormal, maxWidth: 1200, margin: '0 auto', background: t.bgMain, minHeight: '100vh', transition: 'background 0.3s' }}>
     <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
       &larr; Retour
     </button>

     {/* 1. FICHE IDENTITÉ */}
     <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 24, transition: 'background 0.3s' }}>
       <div style={{ height: 48, background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(249, 115, 22, 0.15))', borderBottom: `1px solid ${t.border}`, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
       <div style={{ padding: '0 32px 32px' }}>
         {editingInfo ? (
           <div style={{ marginTop: 24 }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textTitle, marginBottom: 16 }}>Modifier l'identité</h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
               <label style={labelStyle(t.textMuted)}>Nom<input style={inputStyle(t)} value={editInfo.name} onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })} /></label>
               <label style={labelStyle(t.textMuted)}>URL du Logo<input style={inputStyle(t)} value={editInfo.logo_url} onChange={(e) => setEditInfo({ ...editInfo, logo_url: e.target.value })} placeholder="https://..." /></label>
               <label style={labelStyle(t.textMuted)}>Secteur<input style={inputStyle(t)} value={editInfo.sector} onChange={(e) => setEditInfo({ ...editInfo, sector: e.target.value })} /></label>
               <label style={labelStyle(t.textMuted)}>Site web<input style={inputStyle(t)} value={editInfo.website} onChange={(e) => setEditInfo({ ...editInfo, website: e.target.value })} /></label>
               <label style={{ ...labelStyle(t.textMuted), gridColumn: '1 / -1' }}>
                 Description
                 <textarea style={{ ...inputStyle(t), resize: 'vertical', minHeight: 80 }} value={editInfo.description} onChange={(e) => setEditInfo({ ...editInfo, description: e.target.value })} />
               </label>
             </div>
             <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
               <button onClick={saveInfo} disabled={savingInfo} style={btnPrimaryStyle}>{savingInfo ? 'Sauvegarde…' : 'Sauvegarder les infos'}</button>
               <button onClick={() => setEditingInfo(false)} style={btnSecondaryStyle(t)}>Annuler</button>
             </div>
           </div>
         ) : (
           <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginTop: -24 }}>
             <div style={{ width: 88, height: 88, borderRadius: 16, background: t.bgMain, border: `2px solid ${t.bgCard}`, boxShadow: '0 8px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
               {company.logo_url ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : <span style={{ fontSize: 32, fontWeight: 800, color: t.textMuted }}>{company.name.charAt(0).toUpperCase()}</span>}
             </div>
             <div style={{ flex: 1, paddingTop: 32 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: t.textTitle, letterSpacing: '-0.03em' }}>{company.name}</h1>
                   <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                     <div style={{ position: 'relative', display: 'inline-block' }} ref={statusMenuRef}>
                       <button
                         onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                         style={{ appearance: 'none', cursor: 'pointer', padding: '6px 28px 6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, border: `1px solid ${SHARK_STATUS_COLORS[company.global_status as SharkStatus]}40`, backgroundColor: `${SHARK_STATUS_COLORS[company.global_status as SharkStatus]}15`, color: SHARK_STATUS_COLORS[company.global_status as SharkStatus], letterSpacing: '0.04em', textTransform: 'uppercase', outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px' }}
                       >
                         {SHARK_STATUS_LABELS[company.global_status as SharkStatus]}
                         <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', transform: isStatusMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                         </div>
                       </button>
                       {isStatusMenuOpen && (
                         <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '220px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <style>{`.custom-status-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px; color: ${t.textNormal}; transition: background 0.15s; } .custom-status-item:hover { background: ${t.bgHover}; }`}</style>
                           {ALL_STATUSES.map((s) => (
                             <div key={s} className="custom-status-item" onClick={() => { handleGlobalStatusChange(s); setIsStatusMenuOpen(false); }}>
                               <div style={{ width: 10, height: 10, borderRadius: '50%', background: SHARK_STATUS_COLORS[s], boxShadow: `0 0 0 2px ${SHARK_STATUS_COLORS[s]}33` }} />
                               {SHARK_STATUS_LABELS[s]}
                               {company.global_status === s && (
                                 <svg style={{ marginLeft: 'auto', color: SHARK_STATUS_COLORS[s] }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                               )}
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                     {company.sector && <span style={tagStyle(theme)}>{company.sector}</span>}
                   </div>
                 </div>
                 <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={startEditInfo} style={btnSecondaryStyle(t)}>Modifier la fiche</button>
                  <button
                    onClick={handleDeleteCompany}
                    style={{
                      ...btnSecondaryStyle(t),
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
               <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                 {company.website && <InfoField label="Site Web" value={<a href={externalHref(company.website)} target="_blank" rel="noreferrer" style={{ color: t.primary, textDecoration: 'none', fontWeight: 600 }}>{company.website} ↗</a>} t={t} />}
                 {company.size && <InfoField label="Taille" value={company.size} t={t} />}
               </div>
               {company.description && (
                 <div style={{ marginTop: 24 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>À propos</div>
                   <p style={{ margin: 0, color: t.textNormal, fontSize: 14, lineHeight: 1.6 }}>{company.description}</p>
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     </div>

     {/* 2. SECTION CONTACTS & SUIVI (NOUVEAU TABLEAU RELANCES) */}
     <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 32, marginBottom: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
         <div>
           <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.textTitle }}>Points de contact & Suivi</h2>
           <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textSubMuted }}>Historique des relances pour chaque interlocuteur.</p>
         </div>
         {!showAddContact && (
           <button onClick={() => setShowAddContact(true)} style={{ ...btnSecondaryStyle(t), color: t.primary, borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(109, 40, 217, 0.3)' }}>
             + Ajouter un contact
           </button>
         )}
       </div>

       {showAddContact && (
         <div style={{ background: t.bgMain, borderRadius: 12, border: `1px solid ${t.border}`, padding: 24, marginBottom: 24, animation: 'fadeIn 0.2s ease' }}>
           <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: t.textTitle }}>Nouveau point de contact</h3>
           <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
               <label style={labelStyle(t.textMuted)}>Type de contact *<select style={inputStyle(t)} value={newContact.contact_type} onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value as ContactType })}>{Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}</select></label>
               {newContact.contact_type === 'person' && (
                 <>
                   <label style={labelStyle(t.textMuted)}>Prénom<input style={inputStyle(t)} value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} /></label>
                   <label style={labelStyle(t.textMuted)}>Nom<input style={inputStyle(t)} value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} /></label>
                 </>
               )}
               <label style={labelStyle(t.textMuted)}>Email<input type="email" style={inputStyle(t)} value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></label>
               <label style={labelStyle(t.textMuted)}>Téléphone<input type="tel" style={inputStyle(t)} value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></label>
               <label style={labelStyle(t.textMuted)}>Lien LinkedIn<input type="url" style={inputStyle(t)} value={newContact.linkedin_url} onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })} /></label>
             </div>
             <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
               <button type="button" onClick={() => setShowAddContact(false)} style={btnSecondaryStyle(t)}>Annuler</button>
               <button type="submit" disabled={savingContact} style={btnPrimaryStyle}>{savingContact ? 'Ajout...' : 'Ajouter ce contact'}</button>
             </div>
           </form>
         </div>
       )}

       {sortedContacts.length === 0 && !showAddContact && (
         <div style={{ padding: 40, textAlign: 'center', color: t.textSubMuted, background: t.bgMain, borderRadius: 12, border: `1px dashed ${t.border}` }}>
           Aucun contact renseigné pour cette entreprise.
         </div>
       )}

       <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
         {sortedContacts.map(contact => {
           const assignedShark = sharks.find(s => s.contact_id === contact.id);
           const isMyShark = assignedShark && assignedShark.member_id === me?.id;
           const contactFollowUps = followUps.filter(f => f.contact_id === contact.id);
           
           // NOUVEAU : On regarde uniquement la dernière action de CE contact !
           const lastFup = contactFollowUps[contactFollowUps.length - 1];
           let contactStatus = 'Active';
           if (lastFup?.notes === 'Passé en discussion') contactStatus = 'InDiscussion';
           else if (lastFup?.notes === 'Abandonné') contactStatus = 'NoAnswer';

           return (
             <div key={contact.id} style={{ border: `1px solid ${contact.is_primary ? t.primary : t.border}`, borderRadius: 12, overflow: 'hidden' }}>
               <div style={{ background: contact.is_primary ? (theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)') : t.bgMain, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.bgCard, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                     {contact.contact_type === 'person' ? '👤' : contact.contact_type === 'company_linkedin' ? '🔗' : '✉️'}
                   </div>
                   <div>
                     <div style={{ fontWeight: 700, fontSize: 15, color: t.textTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                       {contact.contact_type === 'person' ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Anonyme' : CONTACT_TYPE_LABELS[contact.contact_type]}
                       {contact.is_primary && <span style={{ fontSize: 10, background: t.primary, color: '#fff', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Principal</span>}
                     </div>
                     <div style={{ fontSize: 13, color: t.textMuted, display: 'flex', gap: 12, marginTop: 4 }}>
                       {contact.email && <span>{contact.email}</span>}
                       {contact.phone && <span>{contact.phone}</span>}
                       {contact.linkedin_url && <a href={externalHref(contact.linkedin_url)} target="_blank" rel="noreferrer" style={{ color: t.primary }}>LinkedIn ↗</a>}
                     </div>
                   </div>
                 </div>
                 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {!contact.is_primary && (
                    <button onClick={() => handleSetPrimaryContact(contact.id)} style={{ background: 'none', border: 'none', color: t.textSubMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                      Définir principal
                    </button>
                  )}
                  {editingContactId !== contact.id && (
                    <button onClick={() => startEditContact(contact)} style={{ background: 'none', border: 'none', color: t.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                      Modifier
                    </button>
                  )}
                  <button onClick={() => handleDeleteContact(contact.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                    Supprimer
                  </button>
                </div>
              </div>

              {editingContactId === contact.id && (
                <div style={{ padding: '20px 24px', background: t.bgMain, borderTop: `1px solid ${t.border}` }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: t.textTitle }}>
                    Modifier le contact
                  </h4>
                  <form onSubmit={(e) => handleSaveEditContact(e, contact.id)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                      <label style={labelStyle(t.textMuted)}>
                        Type de contact *
                        <select
                          style={inputStyle(t)}
                          value={editContactForm.contact_type}
                          onChange={(e) => setEditContactForm({ ...editContactForm, contact_type: e.target.value as ContactType })}
                        >
                          {Object.entries(CONTACT_TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {editContactForm.contact_type === 'person' && (
                        <>
                          <label style={labelStyle(t.textMuted)}>
                            Prénom
                            <input
                              style={inputStyle(t)}
                              value={editContactForm.first_name}
                              onChange={(e) => setEditContactForm({ ...editContactForm, first_name: e.target.value })}
                            />
                          </label>
                          <label style={labelStyle(t.textMuted)}>
                            Nom
                            <input
                              style={inputStyle(t)}
                              value={editContactForm.last_name}
                              onChange={(e) => setEditContactForm({ ...editContactForm, last_name: e.target.value })}
                            />
                          </label>
                        </>
                      )}
                      <label style={labelStyle(t.textMuted)}>
                        Email
                        <input
                          type="email"
                          style={inputStyle(t)}
                          value={editContactForm.email}
                          onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                        />
                      </label>
                      <label style={labelStyle(t.textMuted)}>
                        Téléphone
                        <input
                          type="tel"
                          style={inputStyle(t)}
                          value={editContactForm.phone}
                          onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                        />
                      </label>
                      <label style={labelStyle(t.textMuted)}>
                        Lien LinkedIn
                        <input
                          type="url"
                          style={inputStyle(t)}
                          value={editContactForm.linkedin_url}
                          onChange={(e) => setEditContactForm({ ...editContactForm, linkedin_url: e.target.value })}
                        />
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setEditingContactId(null)} style={btnSecondaryStyle(t)}>
                        Annuler
                      </button>
                      <button type="submit" disabled={savingEditContact} style={btnPrimaryStyle}>
                        {savingEditContact ? 'Sauvegarde…' : 'Sauvegarder'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

               {/* Section Suivi et Historique des Relances */}
              <div style={{ padding: '20px 24px', background: t.bgCard, borderTop: `1px solid ${t.border}` }}>
                {!assignedShark ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: t.textSubMuted }}>Personne n'a encore pris ce contact en charge.</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => handleAssignShark(contact.id, me?.id || '')} style={{ ...btnSecondaryStyle(t), color: t.textTitle, fontWeight: 600 }}>
                        Me l'assigner
                      </button>
                      <select onChange={(e) => { if (e.target.value) { handleAssignShark(contact.id, e.target.value); e.target.value = ""; } }} style={{ ...inputStyle(t), padding: '8px 12px', width: 'auto', fontSize: 13, cursor: 'pointer' }} defaultValue="">
                        <option value="" disabled>Assigner à...</option>
                        {members.filter(m => m.id !== me?.id).map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* HEADER : Responsable + Alerte 7 jours */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                           <span style={{ fontSize: 13, fontWeight: 600, color: isMyShark ? t.primary : t.textNormal }}>
                             Responsable : {isMyShark ? 'Moi' : members.find(m => m.id === assignedShark.member_id)?.name || 'Inconnu'}
                           </span>
                           
                           {/* LOGIQUE D'ALERTE : Si > 7 jours et que l'entreprise n'est pas déjà classée */}
                           {(() => {
                              const lastFup = contactFollowUps[contactFollowUps.length - 1];
                              if (!lastFup) return null;
                              
                              const diffDays = Math.floor((new Date().getTime() - new Date(lastFup.follow_up_date).getTime()) / (1000 * 60 * 60 * 24));
                              const isInactive = ['InDiscussion', 'NoAnswer', 'Signed', 'VerbalAgreement', 'Refused'].includes(company?.global_status || '');
                              
                              if (diffDays >= 7 && !isInactive) {
                                  return (
                                     <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 14 }}>⚠️</span> +7 jours : À relancer
                                     </span>
                                  );
                              }
                              return null;
                           })()}
                       </div>
                       
                       <button onClick={() => handleUnassignShark(assignedShark.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                         Se désassigner
                       </button>
                    </div>

                    {/* CORPS : Tableau (Gauche) + Boutons (Droite) */}
                    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                       
                       {/* GAUCHE : Le tableau (largeur restreinte) */}
                       <div style={{ flex: '1 1 300px', maxWidth: 450 }}>
                          {contactFollowUps.length > 0 ? (
                             <div style={{ background: t.bgMain, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                   <tbody>
                                      {contactFollowUps.map((fup, idx) => (
                                         <tr key={fup.id} style={{ borderBottom: idx < contactFollowUps.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                                            <td style={{ padding: '10px 14px', fontWeight: 600, color: t.textTitle }}>
                                               {/* Affichage conditionnel selon la note stockée */}
                                               {fup.notes === 'Passé en discussion' ? '💬 Passé en discussion' :
                                                fup.notes === 'Abandonné' ? '❌ Abandonné (Sans réponse)' :
                                                idx === 0 ? '✔️ 1er contact' : `🔄 Relance ${idx}`}
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                               {editingFollowUpsId === contact.id ? (
                                                   <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                     <input type="date" value={fup.follow_up_date.split('T')[0]} onChange={(e) => handleUpdateFollowUpDate(fup.id, e.target.value)} style={{...inputStyle(t), padding: '4px 8px', width: 'auto'}} />
                                                     <button onClick={() => handleDeleteFollowUp(fup.id)} style={{color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer'}}>✖</button>
                                                   </div>
                                               ) : (
                                                   <span style={{ color: t.textNormal }}>{new Date(fup.follow_up_date).toLocaleDateString('fr-FR')}</span>
                                               )}
                                            </td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                          ) : (
                             <div style={{ padding: '20px', textAlign: 'center', color: t.textSubMuted, fontSize: 13, background: t.bgMain, borderRadius: 8, border: `1px dashed ${t.border}` }}>
                                Aucun contact effectué pour le moment.
                             </div>
                          )}

                          {contactFollowUps.length > 0 && (
                             <div style={{ marginTop: 12 }}>
                                 <button onClick={() => setEditingFollowUpsId(editingFollowUpsId === contact.id ? null : contact.id)} style={{ background: 'none', border: 'none', color: t.textSubMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                    {editingFollowUpsId === contact.id ? 'Terminer la modification' : '✏️ Modifier les dates'}
                                 </button>
                             </div>
                          )}
                       </div>

                       {/* DROITE : Les boutons d'action empilés */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '220px', flexShrink: 0 }}>
                          
                          {/* Affichage isolé basé sur CE contact précis */}
                          {contactStatus === 'InDiscussion' ? (
                              <div style={{ padding: '16px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 12, textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#eab308', marginBottom: 12 }}>
                                      💬 En discussion
                                  </div>
                                  <button onClick={() => handleCancelStatus(contact.id, 'InDiscussion')} style={{ ...btnSecondaryStyle(t), width: '100%', fontSize: 12 }}>
                                      Annuler (Erreur)
                                  </button>
                              </div>
                          ) : contactStatus === 'NoAnswer' ? (
                              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>
                                      ❌ Abandonné
                                  </div>
                                  <button onClick={() => handleCancelStatus(contact.id, 'NoAnswer')} style={{ ...btnSecondaryStyle(t), width: '100%', fontSize: 12 }}>
                                      Annuler (Reprendre)
                                  </button>
                              </div>
                          ) : (
                              <>
                                  {contactFollowUps.length === 0 ? (
                                     <button onClick={() => handleAddFollowUp(contact.id)} style={{ ...btnPrimaryStyle, background: '#3b82f6', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>
                                        ✔️ J'ai contacté
                                     </button>
                                  ) : (
                                     <button onClick={() => handleAddFollowUp(contact.id)} style={{ ...btnPrimaryStyle, background: '#ef4444', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
                                        🔄 J'ai relancé
                                     </button>
                                  )}

                                  {contactFollowUps.length > 0 && (
                                     <>
                                         <button onClick={async () => { await handleAddFollowUp(contact.id, 'Passé en discussion'); handleGlobalStatusChange('InDiscussion'); }} style={{ ...btnPrimaryStyle, background: '#eab308', color: '#fff', padding: '14px', width: '100%', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)' }}>
                                            💬 En discussion
                                         </button>
                                         <button onClick={async () => { await handleAddFollowUp(contact.id, 'Abandonné'); handleGlobalStatusChange('NoAnswer'); }} style={{ ...btnSecondaryStyle(t), background: theme === 'dark' ? '#27272a' : '#e2e8f0', borderColor: 'transparent', padding: '14px', width: '100%' }}>
                                            ❌ Abandonner
                                         </button>
                                     </>
                                  )}
                              </>
                          )}
                       </div>

                    </div>
                  </div>
                )}
              </div>
             </div>
           );
         })}
       </div>
     </div>

     {/* 3. REMARQUE INTERNE */}
     <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 32, marginBottom: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
         <div>
           <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textTitle }}>Remarque interne</h2>
           <div style={{ fontSize: 12, color: t.textSubMuted, marginTop: 4 }}>Visible uniquement par l'équipe.</div>
         </div>
         {!editingRemark && <button onClick={startEditRemark} style={btnSecondaryStyle(t)}>{company.internal_remark ? 'Modifier' : 'Ajouter'}</button>}
       </div>

       {editingRemark ? (
         <div>
           {remarkConflict && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>Conflit : quelqu'un a modifié la remarque. Sa version :<br/><i>{remarkConflict}</i></div>}
           <textarea value={remarkDraft} onChange={(e) => setRemarkDraft(e.target.value)} rows={4} style={{ ...inputStyle(t), width: '100%', marginBottom: 12 }} />
           <div style={{ display: 'flex', gap: 8 }}>
             <button onClick={saveRemark} disabled={savingRemark} style={btnPrimaryStyle}>Sauvegarder</button>
             <button onClick={() => setEditingRemark(false)} style={btnSecondaryStyle(t)}>Annuler</button>
           </div>
         </div>
       ) : (
         <div style={{ fontSize: 14, color: company.internal_remark ? t.textNormal : t.textSubMuted, whiteSpace: 'pre-wrap' }}>
           {company.internal_remark || "Aucune remarque."}
         </div>
       )}
     </div>

     {/* 4. ACCÈS EXPOSANT */}
     {company.global_status === 'Signed' && (
       <div style={{ marginBottom: 24 }}>
         <ExhibitorAccessCard
           company={company}
           editionName={editions.find(e => e.id === company.edition_id)?.name}
           senderName={me?.name}
           senderEmail={me?.email}
           onRegenerate={async () => {
             const res = await regenerateCompanyPassword(company.id);
             setCompany({ ...company, company_password: res.company_password });
             return true;
           }}
           onEditContact={startEditInfo}
         />
       </div>
     )}
   <ConfirmModal
      open={confirmDialog !== null}
      title={confirmDialog?.title ?? ''}
      message={confirmDialog?.message ?? ''}
      confirmLabel={confirmDialog?.confirmLabel}
      loading={confirmLoading}
      onCancel={() => setConfirmDialog(null)}
      onConfirm={async () => {
        if (!confirmDialog) return;
        setConfirmLoading(true);
        try {
          await confirmDialog.onConfirm();
          setConfirmDialog(null);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Erreur');
        } finally {
          setConfirmLoading(false);
        }
      }}
    />
  </div>
);
}

function InfoField({ label, value, t }: { label: string; value: React.ReactNode, t: any }) {
 return (
   <div>
     <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
     <div style={{ fontSize: 14, color: t.textNormal, fontWeight: 500 }}>{value}</div>
   </div>
 );
}

function externalHref(url: string): string {
 return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
}

const tagStyle = (theme: 'dark'|'light'): React.CSSProperties => ({
 display: 'inline-block', padding: '6px 14px', background: theme === 'dark' ? '#18181b' : '#f1f5f9',
 borderRadius: 999, fontSize: 12, color: theme === 'dark' ? '#a1a1aa' : '#475569', fontWeight: 600, border: `1px solid ${theme === 'dark' ? '#27272a' : '#e2e8f0'}`
});
const labelStyle = (color: string): React.CSSProperties => ({
 fontSize: 12, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', flexDirection: 'column', gap: 6
});
const inputStyle = (t: any): React.CSSProperties => ({
 width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, background: t.inputBg, color: t.textNormal, outline: 'none', fontFamily: 'inherit'
});
const btnPrimaryStyle: React.CSSProperties = {
 background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
};
const btnSecondaryStyle = (t: any): React.CSSProperties => ({
 background: 'transparent', color: t.textNormal, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
});