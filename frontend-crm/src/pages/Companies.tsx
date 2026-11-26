import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listCompanies, updateCompany } from '../api/companies';
import { listCompanyContacts } from '../api/contacts';
import { listSharks } from '../api/sharks';
import { listMembers } from '../api/members';
import { getMe } from '../api/auth';
import { useScrollRestore } from '../hooks/useScrollRestore';
import {
  computeQuickCounts,
  filterAndSortCompanies,
  groupOwnerIdsByCompany,
  type QuickView,
  type SortKey,
} from '../lib/companiesFilter';
import type { AuthUser, Company, Member, Shark, SharkStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import CompaniesQuickTabs from '../components/companies/CompaniesQuickTabs';
import CompaniesToolbar from '../components/companies/CompaniesToolbar';
import CompaniesTable from '../components/companies/CompaniesTable';

export default function Companies() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const sortKey = (searchParams.get('sort') as SortKey) || 'updated_at';
  const searchQuery = searchParams.get('q') || '';
  const ownerFilter = searchParams.get('owner') || 'all';
  const viewFilter = (searchParams.get('view') as QuickView) || 'all';
  const statusParam = searchParams.get('statuses');
  const selectedStatuses = useMemo<SharkStatus[]>(
    () => (statusParam ? (statusParam.split(',').filter(Boolean) as SharkStatus[]) : []),
    [statusParam]
  );

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const { saveScrollPosition } = useScrollRestore(
    'crm_companies_scroll',
    location.search,
    !loading
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([listCompanies(), listSharks(), listMembers(), getMe()])
      .then(([companiesRes, sharksRes, membersRes, meData]) => {
        setCompanies(companiesRes);
        setSharks(sharksRes);
        setMembers(membersRes);
        setCurrentUser(meData as AuthUser);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  function updateParams(patch: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true }
    );
  }

  function handleSelectQuickView(view: QuickView) {
    if (view === 'all') updateParams({ view: null, owner: null, statuses: null });
    else if (view === 'mine') updateParams({ view: null, owner: 'me', statuses: null });
    else if (view === 'followup') updateParams({ view: 'followup', owner: null, statuses: null });
    else if (view === 'signed') updateParams({ view: null, owner: null, statuses: 'Signed' });
  }

  const activeQuickView: QuickView | null = useMemo(() => {
    if (viewFilter === 'followup') return 'followup';
    if (ownerFilter === 'me' && selectedStatuses.length === 0) return 'mine';
    if (ownerFilter === 'all' && selectedStatuses.length === 1 && selectedStatuses[0] === 'Signed') {
      return 'signed';
    }
    if (ownerFilter === 'all' && selectedStatuses.length === 0) return 'all';
    return null;
  }, [viewFilter, ownerFilter, selectedStatuses]);

  const ownersByCompany = useMemo(() => groupOwnerIdsByCompany(sharks), [sharks]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const quickCounts = useMemo(
    () => computeQuickCounts(companies, ownersByCompany, currentUser?.id),
    [companies, ownersByCompany, currentUser?.id]
  );

  const filteredCompanies = useMemo(
    () =>
      filterAndSortCompanies({
        companies,
        ownersByCompany,
        currentUserId: currentUser?.id,
        searchQuery,
        selectedStatuses,
        ownerFilter,
        viewFilter,
        sortKey,
      }),
    [
      companies,
      ownersByCompany,
      currentUser?.id,
      searchQuery,
      selectedStatuses,
      ownerFilter,
      viewFilter,
      sortKey,
    ]
  );

  async function handleInlineStatusChange(company: Company, nextStatus: SharkStatus) {
    if (company.global_status === nextStatus) return;

    setUpdatingStatusId(company.id);
    try {
      if (nextStatus === 'InDiscussion') {
        const companyContacts = await listCompanyContacts(company.id);
        if (companyContacts.length === 0) {
          alert(
            "Ajoute d'abord un contact sur la fiche de cette entreprise avant de la passer « En discussion »."
          );
          return;
        }
      }

      const updated = await updateCompany(company.id, { global_status: nextStatus });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? updated : c)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Impossible de modifier le statut');
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function handleOpenCompany(companyId: string) {
    saveScrollPosition();
    navigate(`/companies/${companyId}`);
  }

  if (loading) {
    return (
      <div className="crm-page">
        <div style={{ paddingTop: 20 }}>
          <Spinner label="Chargement de la base de prospection…" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-page">
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger-text)',
            fontSize: 13.5,
          }}
        >
          <strong>Erreur :</strong> {error}
        </div>
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedStatuses.length > 0 ||
      ownerFilter !== 'all' ||
      viewFilter !== 'all'
  );

  return (
    <div className="crm-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Entreprises
          </h1>
          <p className="tabular-nums" style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            {filteredCompanies.length} affichée{filteredCompanies.length > 1 ? 's' : ''} sur{' '}
            {companies.length}
          </p>
        </div>

        <CompaniesQuickTabs
          activeView={activeQuickView}
          counts={quickCounts}
          onSelectView={handleSelectQuickView}
        />
      </div>

      <CompaniesToolbar
        searchQuery={searchQuery}
        selectedStatuses={selectedStatuses}
        ownerFilter={ownerFilter}
        sortKey={sortKey}
        members={members}
        currentUserId={currentUser?.id}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={(val) => updateParams({ q: val || null })}
        onToggleStatus={(status) => {
          const next = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
          updateParams({ statuses: next.join(',') || null, view: null });
        }}
        onClearStatuses={() => updateParams({ statuses: null })}
        onOwnerChange={(owner) =>
          updateParams({ owner: owner === 'all' ? null : owner, view: null })
        }
        onSortChange={(sort) =>
          updateParams({ sort: sort === 'updated_at' ? null : sort })
        }
        onResetAll={() =>
          updateParams({ q: null, statuses: null, owner: null, view: null })
        }
      />

      <CompaniesTable
        companies={filteredCompanies}
        ownersByCompany={ownersByCompany}
        memberNameById={memberNameById}
        updatingStatusId={updatingStatusId}
        onOpenCompany={handleOpenCompany}
        onStatusChange={handleInlineStatusChange}
      />
    </div>
  );
}