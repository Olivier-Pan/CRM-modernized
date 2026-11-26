import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemberOverviewRow } from '../../lib/dashboardMetrics';

interface TeamOverviewTableProps {
  rows: MemberOverviewRow[];
}

export default function TeamOverviewTable({ rows }: TeamOverviewTableProps) {
  const navigate = useNavigate();

  return (
    <div className="crm-card" style={{ overflow: 'hidden', marginTop: 20 }}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Avancement par membre
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Membres ayant au moins une entreprise suivie ({rows.length} actif{rows.length > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <th style={thStyle}>Membre</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Attribuées</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Contactées (sem.)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>En discussion</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Relances (+7j)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Signées</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '28px 18px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Aucune attribution enregistrée pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isLast = idx === rows.length - 1;
                return (
                  <tr
                    key={row.member.id}
                    onClick={() => navigate(`/companies?owner=${row.member.id}`)}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {row.member.name.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {row.member.name}
                        </span>
                      </div>
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.assignedCount}
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: row.weekContactsCount > 0 ? 600 : 400,
                          color:
                            row.weekContactsCount >= 5
                              ? 'var(--status-success-text)'
                              : row.weekContactsCount > 0
                              ? 'var(--accent-text)'
                              : 'var(--text-tertiary)',
                        }}
                      >
                        {row.weekContactsCount} / 5
                      </span>
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.activeDealsCount}
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right' }}>
                      {row.overdueCount > 0 ? (
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--status-warning-bg)',
                            border: '1px solid var(--status-warning-border)',
                            color: 'var(--status-warning-text)',
                          }}
                        >
                          {row.overdueCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>0</span>
                      )}
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right' }}>
                      {row.signedCount > 0 ? (
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--status-success-bg)',
                            border: '1px solid var(--status-success-border)',
                            color: 'var(--status-success-text)',
                          }}
                        >
                          {row.signedCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>0</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  verticalAlign: 'middle',
};