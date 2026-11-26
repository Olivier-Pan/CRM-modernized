import type { ActivityLog } from '../api/logs';
import type { FollowUp } from '../api/follow_ups';
import type { Company, Member, Shark, SharkStatus } from '../types';
import { daysSince, getCurrentWeekMondayIso, parseLocalDate, parseUtcTimestamp } from './dates';
import {
  buildGoalMetric,
  computeWeeklyProgress,
  RELANCE_DELAY_DAYS,
  WEEKLY_INDIVIDUAL_GOAL,
  WEEKLY_TEAM_GOAL,
  type WeeklyProgressSummary,
} from './goals';

export interface ActionPlanItem {
  company: Company;
  diffDays: number;
  neverContacted: boolean;
}

export interface PersonalActionPlan {
  toFollowUp: ActionPlanItem[];
  toStart: ActionPlanItem[];
  inDiscussion: ActionPlanItem[];
  waiting: ActionPlanItem[];
}

export interface MemberOverviewRow {
  member: Member;
  assignedCount: number;
  weekContactsCount: number;
  activeDealsCount: number;
  overdueCount: number;
  signedCount: number;
}

function toParisIso(raw?: string | null): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const d = parseUtcTimestamp(raw);
  if (!d) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function buildPersonalActionPlan(params: {
  companies: Company[];
  mySharks: Shark[];
  myFollowUps: FollowUp[];
}): PersonalActionPlan {
  const { companies, mySharks, myFollowUps } = params;
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const uniqueIds = Array.from(new Set(mySharks.map((s) => s.company_id)));

  const plan: PersonalActionPlan = {
    toFollowUp: [],
    toStart: [],
    inDiscussion: [],
    waiting: [],
  };

  for (const companyId of uniqueIds) {
    const company = companyById.get(companyId);
    if (!company) continue;

    const compFups = myFollowUps
      .filter((f) => f.company_id === company.id)
      .sort(
        (a, b) =>
          parseLocalDate(a.follow_up_date).getTime() -
          parseLocalDate(b.follow_up_date).getTime()
      );

    const globalStatus = company.global_status || 'ToContact';
    let derivedStatus = globalStatus;
    let diffDays = daysSince(company.updated_at);

    if (compFups.length > 0) {
      const lastFup = compFups[compFups.length - 1];
      diffDays = daysSince(lastFup.follow_up_date);

      if (globalStatus === 'ToContact' || globalStatus === 'Contacted') {
        if (lastFup.notes === 'Passé en discussion') derivedStatus = 'InDiscussion';
        else if (lastFup.notes === 'Abandonné') derivedStatus = 'NoAnswer';
        else derivedStatus = 'Contacted';
      }
    }

    if (['Signed', 'VerbalAgreement', 'Refused', 'NoAnswer'].includes(derivedStatus)) {
      continue;
    }

    if (derivedStatus === 'InDiscussion') {
      plan.inDiscussion.push({ company, diffDays, neverContacted: false });
    } else if (derivedStatus === 'Contacted') {
      if (diffDays >= RELANCE_DELAY_DAYS) {
        plan.toFollowUp.push({ company, diffDays, neverContacted: false });
      } else {
        plan.waiting.push({ company, diffDays, neverContacted: false });
      }
    } else {
      plan.toStart.push({ company, diffDays, neverContacted: true });
    }
  }

  plan.toFollowUp.sort((a, b) => b.diffDays - a.diffDays);
  plan.inDiscussion.sort((a, b) => b.diffDays - a.diffDays);
  plan.waiting.sort((a, b) => b.diffDays - a.diffDays);
  plan.toStart.sort((a, b) => b.diffDays - a.diffDays);

  return plan;
}

export function computeIndividualWeeklySummary(params: {
  companies: Company[];
  mySharks: Shark[];
  myFollowUps: FollowUp[];
  overdueCount: number;
}): WeeklyProgressSummary {
  const { companies, mySharks, myFollowUps, overdueCount } = params;
  const mondayIso = getCurrentWeekMondayIso();
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const newContactCompanies = new Set<string>();
  const relancedCompanies = new Set<string>();

  const uniqueCompanyIds = Array.from(new Set(mySharks.map((s) => s.company_id)));

  for (const companyId of uniqueCompanyIds) {
    const company = companyById.get(companyId);
    if (!company) continue;

    const regularFups = myFollowUps
      .filter(
        (f) =>
          f.company_id === companyId &&
          f.notes !== 'Passé en discussion' &&
          f.notes !== 'Abandonné'
      )
      .sort(
        (a, b) =>
          parseLocalDate(a.follow_up_date).getTime() -
          parseLocalDate(b.follow_up_date).getTime()
      );

    if (regularFups.length > 0) {
      const firstIso = regularFups[0].follow_up_date.split('T')[0];
      if (firstIso >= mondayIso) {
        newContactCompanies.add(companyId);
      }
      for (const fup of regularFups.slice(1)) {
        const fupIso = fup.follow_up_date.split('T')[0];
        if (fupIso >= mondayIso) {
          relancedCompanies.add(companyId);
        }
      }
    } else if (company.global_status !== 'ToContact') {
      const shark = mySharks.find((s) => s.company_id === companyId);
      const firstIso = toParisIso(shark?.contact_date || shark?.created_at);
      if (firstIso && firstIso >= mondayIso) {
        newContactCompanies.add(companyId);
      }
    }
  }

  const relancesDone = relancedCompanies.size;
  return {
    newContacts: buildGoalMetric(newContactCompanies.size, WEEKLY_INDIVIDUAL_GOAL),
    relances: buildGoalMetric(relancesDone, relancesDone + overdueCount),
    overdueCount,
  };
}

export function computeTeamWeeklySummary(params: {
  companies: Company[];
  sharks: Shark[];
  logs: ActivityLog[];
}): WeeklyProgressSummary {
  const { companies, sharks, logs } = params;
  const mondayIso = getCurrentWeekMondayIso();
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const contactedThisWeekNames = new Set<string>();

  for (const log of logs) {
    const logIso = toParisIso(log.created_at);
    if (!logIso || logIso < mondayIso) continue;
    if (
      log.old_status === 'ToContact' &&
      ['Contacted', 'InDiscussion', 'VerbalAgreement', 'Signed'].includes(log.new_status)
    ) {
      contactedThisWeekNames.add(log.company_name.trim().toLowerCase());
    }
  }

  for (const shark of sharks) {
    const company = companyById.get(shark.company_id);
    if (!company || company.global_status === 'ToContact') continue;
    const firstIso = toParisIso(shark.contact_date || shark.created_at);
    if (firstIso && firstIso >= mondayIso) {
      contactedThisWeekNames.add(company.name.trim().toLowerCase());
    }
  }

  const base = computeWeeklyProgress({ companies, sharks });
  return {
    newContacts: buildGoalMetric(contactedThisWeekNames.size, WEEKLY_TEAM_GOAL),
    relances: base.relances,
    overdueCount: base.overdueCount,
  };
}

export function buildMemberOverview(params: {
  members: Member[];
  sharks: Shark[];
  companies: Company[];
}): MemberOverviewRow[] {
  const { members, sharks, companies } = params;
  const mondayIso = getCurrentWeekMondayIso();
  const companyById = new Map(companies.map((c) => [c.id, c]));

  return members
    .map((member) => {
      const memberSharks = sharks.filter((s) => s.member_id === member.id);
      const uniqueCompanyIds = Array.from(new Set(memberSharks.map((s) => s.company_id)));

      let signedCount = 0;
      let activeDealsCount = 0;
      let overdueCount = 0;
      let weekContactsCount = 0;

      for (const companyId of uniqueCompanyIds) {
        const company = companyById.get(companyId);
        if (!company) continue;

        if (company.global_status === 'Signed') signedCount += 1;
        if (['InDiscussion', 'VerbalAgreement'].includes(company.global_status)) {
          activeDealsCount += 1;
        }
        if (company.global_status === 'Contacted' && daysSince(company.updated_at) >= RELANCE_DELAY_DAYS) {
          overdueCount += 1;
        }

        const firstShark = memberSharks.find((s) => s.company_id === companyId);
        const firstIso = toParisIso(firstShark?.contact_date || firstShark?.created_at);
        if (company.global_status !== 'ToContact' && firstIso && firstIso >= mondayIso) {
          weekContactsCount += 1;
        }
      }

      return {
        member,
        assignedCount: uniqueCompanyIds.length,
        weekContactsCount,
        activeDealsCount,
        overdueCount,
        signedCount,
      };
    })
    .filter((row) => row.assignedCount > 0 || row.weekContactsCount > 0)
    .sort((a, b) => {
      if (b.signedCount !== a.signedCount) return b.signedCount - a.signedCount;
      if (b.weekContactsCount !== a.weekContactsCount) return b.weekContactsCount - a.weekContactsCount;
      return b.assignedCount - a.assignedCount;
    });
}

export function cleanActivityLogs(
  logs: ActivityLog[],
  filter: 'all' | 'milestones'
): ActivityLog[] {
  const collapsed: ActivityLog[] = [];

  for (const log of logs) {
    const prev = collapsed[collapsed.length - 1];
    const logTime = parseUtcTimestamp(log.created_at)?.getTime() ?? 0;
    const prevTime = prev ? parseUtcTimestamp(prev.created_at)?.getTime() ?? 0 : 0;

    // Regroupe les changements successifs sur la même entreprise par le même membre (< 5 min)
    if (
      prev &&
      prev.member_name === log.member_name &&
      prev.company_name === log.company_name &&
      Math.abs(prevTime - logTime) <= 5 * 60 * 1000
    ) {
      prev.old_status = log.old_status;
    } else {
      collapsed.push({ ...log });
    }
  }

  const meaningful = collapsed.filter((l) => l.old_status !== l.new_status);

  if (filter === 'milestones') {
    const milestones: SharkStatus[] = ['InDiscussion', 'VerbalAgreement', 'Signed'];
    return meaningful.filter((l) => milestones.includes(l.new_status));
  }
  return meaningful;
}