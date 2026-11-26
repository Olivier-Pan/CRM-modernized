import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCompany,
  updateCompany,
  regenerateCompanyPassword,
  deleteCompany,
} from '../api/companies';
import { listCompanyContacts, deleteContact } from '../api/contacts';
import { listSharks, deleteShark } from '../api/sharks';
import { listFollowUps, deleteFollowUp, type FollowUp } from '../api/follow_ups';
import { getMe } from '../api/auth';
import { listMembers } from '../api/members';
import { listEditions } from '../api/editions';
import { useTheme } from '../hooks/useTheme';
import { getCompanyDetailTheme } from '../components/company-detail/styles';
import CompanyIdentityCard from '../components/company-detail/CompanyIdentityCard';
import CompanyContactsSection from '../components/company-detail/CompanyContactsSection';
import InternalRemarkCard from '../components/company-detail/InternalRemarkCard';
import ExhibitorAccessCard from '../components/ExhibitorAccessCard';
import { BrochureReadOnlyPanel } from '../components/BrochureReadOnlyPanel';
import ConfirmModal from '../components/ConfirmModal';
import type {
  Company,
  Shark,
  SharkStatus,
  AuthUser,
  Member,
  Edition,
  Contact,
} from '../types';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

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

  // Permet d'ouvrir le formulaire d'édition de la fiche identité depuis ExhibitorAccessCard
  const [editInfoTrigger, setEditInfoTrigger] = useState(0);

  // --- MODALE DE CONFIRMATION ---
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  function handleRequestDeleteContact(contactId: string) {
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

  function handleRequestUnassignShark(sharkId: string) {
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

  function handleRequestDeleteFollowUp(fupId: string) {
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

  if (loading) {
    return (
      <div style={{ padding: 48, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
        <div style={{ width: 16, height: 16, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Chargement de la fiche entreprise…
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !company) {
    return <div style={{ padding: 40, color: '#ef4444' }}>Erreur : {error || 'Entreprise introuvable'}</div>;
  }

  return (
    <div style={{ padding: '36px 44px', color: t.textNormal, maxWidth: 1200, margin: '0 auto', background: t.bgMain, minHeight: '100vh', transition: 'background 0.3s' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}
      >
        &larr; Retour
      </button>

      {/* 1. FICHE IDENTITÉ */}
      <CompanyIdentityCard
        company={company}
        onCompanyUpdated={setCompany}
        onStatusChange={handleGlobalStatusChange}
        onDeleteClick={handleDeleteCompany}
        externalEditTrigger={editInfoTrigger}
      />

      {/* 2. CONTACTS & SUIVI */}
      <CompanyContactsSection
        companyId={company.id}
        companyStatus={company.global_status}
        contacts={contacts}
        sharks={sharks}
        followUps={followUps}
        me={me}
        members={members}
        onContactCreated={(created) => setContacts((prev) => [...prev, created])}
        onContactUpdated={(updated) => setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
        onContactsReplaced={setContacts}
        onRequestDeleteContact={handleRequestDeleteContact}
        onSharkAssigned={(shark) => setSharks((prev) => [...prev, shark])}
        onRequestUnassignShark={handleRequestUnassignShark}
        onFollowUpAdded={(fup) => setFollowUps((prev) => [...prev, fup])}
        onFollowUpUpdated={(fup) => setFollowUps((prev) => prev.map((f) => (f.id === fup.id ? fup : f)))}
        onFollowUpRemoved={(fupId) => setFollowUps((prev) => prev.filter((f) => f.id !== fupId))}
        onRequestDeleteFollowUp={handleRequestDeleteFollowUp}
        onStatusChange={handleGlobalStatusChange}
      />

      {/* 3. REMARQUE INTERNE */}
      <InternalRemarkCard
        company={company}
        onCompanyUpdated={setCompany}
      />

      {/* 4. ACCÈS EXPOSANT & FORMULAIRE BROCHURE */}
      {company.global_status === 'Signed' && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ExhibitorAccessCard
            company={company}
            contactEmail={
              contacts.find((c) => c.is_primary && c.email)?.email ||
              contacts.find((c) => c.email)?.email
            }
            editionName={editions.find((e) => e.id === company.edition_id)?.name}
            senderName={me?.name}
            senderEmail={me?.email}
            onRegenerate={async () => {
              const res = await regenerateCompanyPassword(company.id);
              setCompany({ ...company, company_password: res.company_password });
              return true;
            }}
            onEditContact={() => {
              setEditInfoTrigger((n) => n + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          <BrochureReadOnlyPanel companyId={company.id} />
        </div>
      )}

      {/* MODALE DE CONFIRMATION */}
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