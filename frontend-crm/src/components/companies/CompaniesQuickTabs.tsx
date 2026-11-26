import type { QuickCounts, QuickView } from '../../lib/companiesFilter';

interface CompaniesQuickTabsProps {
  activeView: QuickView | null;
  counts: QuickCounts;
  onSelectView: (view: QuickView) => void;
}

export default function CompaniesQuickTabs({
  activeView,
  counts,
  onSelectView,
}: CompaniesQuickTabsProps) {
  const tabs: Array<{ id: QuickView; label: string; count: number }> = [
    { id: 'all', label: 'Toutes', count: counts.all },
    { id: 'mine', label: 'Mes attributions', count: counts.mine },
    { id: 'followup', label: 'À relancer (+7j)', count: counts.followup },
    { id: 'signed', label: 'Signées', count: counts.signed },
  ];

  return (
    <div
      role="tablist"
      aria-label="Vues rapides"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 8,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab) => {
        const active = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectView(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              border: 'none',
              background: active ? 'var(--bg-subtle)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 12.5,
              fontWeight: active ? 600 : 500,
            }}
          >
            <span>{tab.label}</span>
            <span
              className="tabular-nums"
              style={{
                fontSize: 11,
                padding: '1px 5px',
                borderRadius: 4,
                background: active ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                color:
                  tab.id === 'followup' && tab.count > 0
                    ? 'var(--status-warning-text)'
                    : 'var(--text-tertiary)',
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}