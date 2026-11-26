import type { Company, Shark, SharkStatus } from '../types';
import { daysSince } from './dates';
import { RELANCE_DELAY_DAYS } from './goals';

export type SortKey = 'updated_at' | 'created_at' | 'name';
export type QuickView = 'all' | 'mine' | 'followup' | 'signed';

export const SORT_LABELS: Record<SortKey, string> = {
  updated_at: 'Dernière activité',
  created_at: 'Date de création',
  name: 'Ordre alphabétique',
};

export interface QuickCounts {
  all: number;
  mine: number;
  followup: number;
  signed: number;
}

export function groupOwnerIdsByCompany(sharks: Shark[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const s of sharks) {
    const list = map.get(s.company_id) || [];
    if (!list.includes(s.member_id)) {
      list.push(s.member_id);
      map.set(s.company_id, list);
    }
  }
  return map;
}

export function isCompanyOverdue(company: Company): boolean {
  return (
    company.global_status === 'Contacted' &&
    daysSince(company.updated_at) >= RELANCE_DELAY_DAYS
  );
}

export function computeQuickCounts(
  companies: Company[],
  ownersByCompany: Map<string, string[]>,
  currentUserId?: string
): QuickCounts {
  let mine = 0;
  let followup = 0;
  let signed = 0;

  for (const c of companies) {
    const owners = ownersByCompany.get(c.id) || [];
    if (currentUserId && owners.includes(currentUserId)) mine += 1;
    if (c.global_status === 'Signed') signed += 1;
    if (isCompanyOverdue(c)) followup += 1;
  }

  return { all: companies.length, mine, followup, signed };
}

export function filterAndSortCompanies(params: {
  companies: Company[];
  ownersByCompany: Map<string, string[]>;
  currentUserId?: string;
  searchQuery: string;
  selectedStatuses: SharkStatus[];
  ownerFilter: string;
  viewFilter: QuickView;
  sortKey: SortKey;
}): Company[] {
  const {
    companies,
    ownersByCompany,
    currentUserId,
    searchQuery,
    selectedStatuses,
    ownerFilter,
    viewFilter,
    sortKey,
  } = params;

  const q = searchQuery.trim().toLowerCase();

  return companies
    .filter((c) => {
      if (viewFilter === 'followup' && !isCompanyOverdue(c)) return false;

      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(c.global_status as SharkStatus)
      ) {
        return false;
      }

      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchSector = (c.sector || '').toLowerCase().includes(q);
        if (!matchName && !matchSector) return false;
      }

      if (ownerFilter !== 'all') {
        const owners = ownersByCompany.get(c.id) || [];
        const targetId = ownerFilter === 'me' ? currentUserId : ownerFilter;
        if (!targetId || !owners.includes(targetId)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'fr');
      if (sortKey === 'created_at') return (b.created_at || '').localeCompare(a.created_at || '');
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });
}