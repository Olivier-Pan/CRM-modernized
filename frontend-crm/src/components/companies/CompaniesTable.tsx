import React from 'react';
import { isCompanyOverdue } from '../../lib/companiesFilter';
import { isExhibitorPortalEligible } from '../../lib/status';
import { formatRelativeDate } from '../../lib/dates';
import type { Company, SharkStatus } from '../../types';
import CompanyAvatar from '../ui/CompanyAvatar';
import StatusDropdown from '../ui/StatusDropdown';

interface CompaniesTableProps {
  companies: Company[];
  ownersByCompany: Map<string, string[]>;
  memberNameById: Map<string, string>;
  updatingStatusId: string | null;
  onOpenCompany: (companyId: string) => void;
  onStatusChange: (company: Company, nextStatus: SharkStatus) => void;
}

export default function CompaniesTable({
  companies,
  ownersByCompany,
  memberNameById,
  updatingStatusId,
  onOpenCompany,
  onStatusChange,
}: CompaniesTableProps) {
  return (
    <div className="crm-card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 680,
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <th style={thStyle}>Entreprise</th>
              <th style={{ ...thStyle, width: 175 }}>Statut</th>
              <th style={{ ...thStyle, width: 220 }}>Responsables</th>
              <th style={{ ...thStyle, width: 140 }}>Activité</th>
              <th style={{ ...thStyle, width: 155, textAlign: 'right' }}>Portail</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '44px 20px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 13.5,
                  }}
                >
                  Aucune entreprise ne correspond aux filtres actuels.
                </td>
              </tr>
            ) : (
              companies.map((company, idx) => {
                const ownerIds = ownersByCompany.get(company.id) || [];
                const ownerNames = ownerIds.map((id) => memberNameById.get(id) || 'Inconnu');
                const overdue = isCompanyOverdue(company);
                const isLast = idx === companies.length - 1;

                return (
                  <tr
                    key={company.id}
                    onClick={() => onOpenCompany(company.id)}
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
                    {/* 1. Entreprise + Secteur */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
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
                                fontSize: 12,
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
                    </td>

                    {/* 2. Statut inline (StatusDropdown anti-rognage) */}
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown
                        value={company.global_status}
                        disabled={updatingStatusId === company.id}
                        onChange={(nextStatus) => onStatusChange(company, nextStatus)}
                      />
                    </td>

                    {/* 3. Responsables dédupliqués */}
                    <td style={tdStyle}>
                      {ownerNames.length === 0 ? (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {ownerNames.join(', ')}
                        </span>
                      )}
                    </td>

                    {/* 4. Dernière activité */}
                    <td style={tdStyle}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: 12.5,
                          fontWeight: overdue ? 600 : 400,
                          color: overdue
                            ? 'var(--status-warning-text)'
                            : 'var(--text-tertiary)',
                        }}
                      >
                        {formatRelativeDate(company.updated_at)}
                      </span>
                    </td>

                    {/* 5. Indicateur portail exposant & formulaire */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {company.brochure_filled ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 5,
                            fontSize: 11.5,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            color: 'var(--status-success-text)',
                            background: 'var(--status-success-bg)',
                            border: '1px solid var(--status-success-border)',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'var(--status-success-text)',
                              flexShrink: 0,
                            }}
                          />
                          Formulaire rempli
                        </span>
                      ) : isExhibitorPortalEligible(company.global_status) ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: 5,
                            fontSize: 11.5,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            color: company.company_password
                              ? 'var(--status-info-text)'
                              : 'var(--status-warning-text)',
                            background: company.company_password
                              ? 'var(--status-info-bg)'
                              : 'var(--status-warning-bg)',
                            border: `1px solid ${
                              company.company_password
                                ? 'var(--status-info-border)'
                                : 'var(--status-warning-border)'
                            }`,
                          }}
                        >
                          {company.company_password ? 'Accès prêt' : 'Sans mdp'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
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
  padding: '11px 16px',
  verticalAlign: 'middle',
};