import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActionPlanItem, PersonalActionPlan } from '../../lib/dashboardMetrics';
import CompanyAvatar from '../ui/CompanyAvatar';

interface ActionPlanPanelProps {
  plan: PersonalActionPlan;
}

type PlanTab = 'followup' | 'start' | 'discussion' | 'waiting';

export default function ActionPlanPanel({ plan }: ActionPlanPanelProps) {
  const navigate = useNavigate();

  const initialTab: PlanTab =
    plan.toFollowUp.length > 0
      ? 'followup'
      : plan.toStart.length > 0
      ? 'start'
      : plan.inDiscussion.length > 0
      ? 'discussion'
      : 'waiting';

  const [activeTab, setActiveTab] = useState<PlanTab>(initialTab);

  const tabs: Array<{
    id: PlanTab;
    label: string;
    items: ActionPlanItem[];
    badgeColor: string;
    badgeBg: string;
    emptyText: string;
  }> = [
    {
      id: 'followup',
      label: 'À relancer (+7j)',
      items: plan.toFollowUp,
      badgeColor: 'var(--status-danger-text)',
      badgeBg: 'var(--status-danger-bg)',
      emptyText: 'Aucune relance en retard.',
    },
    {
      id: 'start',
      label: 'À démarrer',
      items: plan.toStart,
      badgeColor: 'var(--accent-text)',
      badgeBg: 'var(--accent-subtle-bg)',
      emptyText: 'Toutes tes entreprises assignées ont déjà été contactées.',
    },
    {
      id: 'discussion',
      label: 'En discussion',
      items: plan.inDiscussion,
      badgeColor: 'var(--status-warning-text)',
      badgeBg: 'var(--status-warning-bg)',
      emptyText: 'Aucune discussion active en cours.',
    },
    {
      id: 'waiting',
      label: 'En attente (<7j)',
      items: plan.waiting,
      badgeColor: 'var(--text-secondary)',
      badgeBg: 'var(--bg-subtle)',
      emptyText: 'Aucun contact récent en attente de réponse.',
    },
  ];

  const current = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div
      className="crm-card"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        height: 430,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Mon plan d'action
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Dossiers qui te sont attribués par priorité
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/companies?owner=me')}
          className="crm-btn crm-btn-ghost crm-btn-sm"
        >
          Tout voir &#8599;
        </button>
      </div>

      {/* Onglets de file */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 9px',
                borderRadius: 6,
                border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
                background: active ? 'var(--bg-subtle)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
              }}
            >
              <span>{tab.label}</span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '0 5px',
                  borderRadius: 4,
                  background: tab.items.length > 0 ? tab.badgeBg : 'var(--bg-subtle)',
                  color: tab.items.length > 0 ? tab.badgeColor : 'var(--text-tertiary)',
                }}
              >
                {tab.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingRight: 2,
        }}
      >
        {current.items.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 20,
              fontSize: 13,
              color: 'var(--text-tertiary)',
            }}
          >
            {current.emptyText}
          </div>
        ) : (
          current.items.map(({ company, diffDays, neverContacted }) => (
            <button
              key={company.id}
              type="button"
              onClick={() => navigate(`/companies/${company.id}`)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 8,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'left',
                transition: 'background-color 0.1s ease, border-color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-subtle)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {company.name}
                  </div>
                  {company.sector && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {company.sector}
                    </div>
                  )}
                </div>
              </div>

              <span
                className="tabular-nums"
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  flexShrink: 0,
                  color:
                    activeTab === 'followup'
                      ? 'var(--status-danger-text)'
                      : 'var(--text-tertiary)',
                }}
              >
                {neverContacted
                  ? 'Jamais contactée'
                  : diffDays === 0
                  ? "Aujourd'hui"
                  : diffDays === 1
                  ? 'Hier'
                  : `Il y a ${diffDays}j`}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}