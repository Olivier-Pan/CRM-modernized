import type { Company, Shark } from '../types';
import { daysSince, getCurrentWeekMondayIso, parseUtcTimestamp } from './dates';

export const WEEKLY_INDIVIDUAL_GOAL = 5;
export const WEEKLY_TEAM_GOAL = 150;
export const RELANCE_DELAY_DAYS = 7;

export interface GoalMetric {
  current: number;
  target: number;
  percent: number;
  completed: boolean;
}

export interface WeeklyProgressSummary {
  newContacts: GoalMetric;
  relances: GoalMetric;
  overdueCount: number;
}

export interface WeeklyActivityEvent {
  companyId: string;
  memberId?: string;
  date: string;
  kind: 'first_contact' | 'follow_up';
}

function toParisIsoDate(raw?: string | null): string | null {
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

export function buildGoalMetric(current: number, target: number): GoalMetric {
  if (target <= 0) {
    return { current, target: 0, percent: 100, completed: true };
  }
  const percent = Math.min(100, Math.round((current / target) * 100));
  return { current, target, percent, completed: current >= target };
}

export function computeWeeklyProgress(params: {
  companies: Company[];
  sharks: Shark[];
  memberId?: string;
  events?: WeeklyActivityEvent[];
}): WeeklyProgressSummary {
  const { companies, sharks, memberId, events } = params;
  const mondayIso = getCurrentWeekMondayIso();
  const targetNewContacts = memberId ? WEEKLY_INDIVIDUAL_GOAL : WEEKLY_TEAM_GOAL;

  const companyById = new Map(companies.map((c) => [c.id, c]));
  const scopedSharks = memberId
    ? sharks.filter((s) => s.member_id === memberId)
    : sharks;

  const scopedCompanyIds = new Set(scopedSharks.map((s) => s.company_id));
  const newContactCompanies = new Set<string>();
  const relancedCompanies = new Set<string>();

  if (events && events.length > 0) {
    for (const ev of events) {
      if (memberId && ev.memberId !== memberId) continue;
      const evIso = toParisIsoDate(ev.date);
      if (!evIso || evIso < mondayIso) continue;
      if (ev.kind === 'first_contact') newContactCompanies.add(ev.companyId);
      if (ev.kind === 'follow_up') relancedCompanies.add(ev.companyId);
    }
  } else {
    for (const shark of scopedSharks) {
      const company = companyById.get(shark.company_id);
      if (!company || company.global_status === 'ToContact') continue;

      const firstDateIso = toParisIsoDate(shark.contact_date || shark.created_at);
      const updatedIso = toParisIsoDate(shark.updated_at || company.updated_at);

      if (firstDateIso && firstDateIso >= mondayIso) {
        newContactCompanies.add(shark.company_id);
      } else if (updatedIso && updatedIso >= mondayIso) {
        relancedCompanies.add(shark.company_id);
      }
    }
  }

  let overdueCount = 0;
  for (const companyId of scopedCompanyIds) {
    const company = companyById.get(companyId);
    if (!company || company.global_status !== 'Contacted') continue;
    if (daysSince(company.updated_at) >= RELANCE_DELAY_DAYS) {
      overdueCount += 1;
    }
  }

  const relancesDone = relancedCompanies.size;
  const relancesTarget = relancesDone + overdueCount;

  return {
    newContacts: buildGoalMetric(newContactCompanies.size, targetNewContacts),
    relances: buildGoalMetric(relancesDone, relancesTarget),
    overdueCount,
  };
}