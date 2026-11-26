import { useEffect, useMemo, useState } from 'react';
import { listCompanies } from '../api/companies';
import { listSharks } from '../api/sharks';
import { listMembers } from '../api/members';
import { getLogs, type ActivityLog } from '../api/logs';
import { listFollowUps, type FollowUp } from '../api/follow_ups';
import { getMe } from '../api/auth';
import { listEditions } from '../api/editions';
import type { AuthUser, Company, Edition, Member, Shark } from '../types';
import {
  buildMemberOverview,
  buildPersonalActionPlan,
  computeIndividualWeeklySummary,
  computeTeamWeeklySummary,
} from '../lib/dashboardMetrics';
import Spinner from '../components/ui/Spinner';
import WeeklyProgressRow from '../components/dashboard/WeeklyProgressRow';
import PipelineStrip from '../components/dashboard/PipelineStrip';
import ActionPlanPanel from '../components/dashboard/ActionPlanPanel';
import LiveFeedPanel from '../components/dashboard/LiveFeedPanel';
import TeamOverviewTable from '../components/dashboard/TeamOverviewTable';

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [myFollowUps, setMyFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      listCompanies(),
      listSharks(),
      listMembers(),
      getLogs(),
      getMe(),
      listEditions().catch(() => [] as Edition[]),
    ])
      .then(async ([companiesData, sharksData, membersData, logsData, meData, editionsData]) => {
        setCompanies(companiesData);
        setSharks(sharksData);
        setMembers(membersData);
        setLogs(logsData);
        setMe(meData as AuthUser);
        setEditions(editionsData);

        const mine = sharksData.filter((s) => s.member_id === meData.id);
        const uniqueCompanyIds = Array.from(new Set(mine.map((s) => s.company_id)));
        const fupResults = await Promise.all(
          uniqueCompanyIds.map((id) => listFollowUps(id).catch(() => [] as FollowUp[]))
        );
        setMyFollowUps(fupResults.flat());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const mySharks = useMemo(
    () => (me ? sharks.filter((s) => s.member_id === me.id) : []),
    [sharks, me]
  );

  const actionPlan = useMemo(
    () => buildPersonalActionPlan({ companies, mySharks, myFollowUps }),
    [companies, mySharks, myFollowUps]
  );

  const individualSummary = useMemo(
    () =>
      computeIndividualWeeklySummary({
        companies,
        mySharks,
        myFollowUps,
        overdueCount: actionPlan.toFollowUp.length,
      }),
    [companies, mySharks, myFollowUps, actionPlan.toFollowUp.length]
  );

  const teamSummary = useMemo(
    () => computeTeamWeeklySummary({ companies, sharks, logs }),
    [companies, sharks, logs]
  );

  const memberOverview = useMemo(
    () => buildMemberOverview({ members, sharks, companies }),
    [members, sharks, companies]
  );

  const activeEdition = editions.find((e) => e.is_active) || editions[0];

  if (loading) {
    return (
      <div className="crm-page">
        <div style={{ paddingTop: 20 }}>
          <Spinner label="Chargement du tableau de bord…" />
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

  return (
    <div className="crm-page">
      {/* En-tête sobre */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
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
            Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Objectifs hebdomadaires, plan d'action personnel et avancement de l'équipe
          </p>
        </div>

        {activeEdition && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            {activeEdition.name}
          </span>
        )}
      </div>

      {/* 1. Double barre de progression hebdomadaire (5/sem individuel + 150/sem équipe) */}
      <WeeklyProgressRow individual={individualSummary} team={teamSummary} />

      {/* 2. Pipeline global aligné */}
      <PipelineStrip companies={companies} />

      {/* 3. Plan d'action personnel + Live Feed nettoyé */}
      <div className="crm-grid-2">
        <ActionPlanPanel plan={actionPlan} />
        <LiveFeedPanel logs={logs} />
      </div>

      {/* 4. Avancement par membre */}
      <TeamOverviewTable rows={memberOverview} />
    </div>
  );
}