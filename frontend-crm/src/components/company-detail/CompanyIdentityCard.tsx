import React, { useEffect, useRef, useState } from 'react';
import { updateCompany } from '../../api/companies';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { Company, SharkStatus } from '../../types';
import CompanyAvatar from '../ui/CompanyAvatar';
import { IconMore } from '../ui/Icons';
import StatusDropdown from '../ui/StatusDropdown';

interface CompanyIdentityCardProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
  onStatusChange: (newStatus: SharkStatus) => Promise<void>;
  onDeleteClick: () => void;
  externalEditTrigger?: number;
}

function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function CompanyIdentityCard({
  company,
  onCompanyUpdated,
  onStatusChange,
  onDeleteClick,
  externalEditTrigger = 0,
}: CompanyIdentityCardProps) {
  const [editingInfo, setEditingInfo] = useState(false);
  const [editInfo, setEditInfo] = useState({
    name: '',
    logo_url: '',
    sector: '',
    size: '',
    website: '',
    description: '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreMenuRef, () => setIsMoreMenuOpen(false), isMoreMenuOpen);

  useEffect(() => {
    if (externalEditTrigger > 0) {
      startEditInfo();
    }
  }, [externalEditTrigger]);

  function startEditInfo() {
    setEditInfo({
      name: company.name || '',
      logo_url: company.logo_url || '',
      sector: company.sector || '',
      size: company.size || '',
      website: company.website || '',
      description: company.description || '',
    });
    setEditingInfo(true);
  }

  async function saveInfo() {
    setSavingInfo(true);
    try {
      const updated = await updateCompany(company.id, {
        name: editInfo.name,
        logo_url: editInfo.logo_url,
        sector: editInfo.sector,
        size: editInfo.size,
        website: editInfo.website,
        description: editInfo.description,
      });
      onCompanyUpdated(updated);
      setEditingInfo(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingInfo(false);
    }
  }

  return (
    <div className="crm-card" style={{ padding: 20 }}>
      {editingInfo ? (
        <div>
          <div
            style={{
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Modifier l'identité de l'entreprise
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 14,
            }}
          >
            <label style={labelStyle}>
              Nom
              <input
                className="crm-input"
                value={editInfo.name}
                onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })}
              />
            </label>
            <label style={labelStyle}>
              URL du logo
              <input
                className="crm-input"
                value={editInfo.logo_url}
                onChange={(e) => setEditInfo({ ...editInfo, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label style={labelStyle}>
              Secteur
              <input
                className="crm-input"
                value={editInfo.sector}
                onChange={(e) => setEditInfo({ ...editInfo, sector: e.target.value })}
              />
            </label>
            <label style={labelStyle}>
              Effectif
              <input
                className="crm-input"
                value={editInfo.size}
                onChange={(e) => setEditInfo({ ...editInfo, size: e.target.value })}
              />
            </label>
            <label style={labelStyle}>
              Site web
              <input
                className="crm-input"
                value={editInfo.website}
                onChange={(e) => setEditInfo({ ...editInfo, website: e.target.value })}
              />
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              Description
              <textarea
                className="crm-input"
                style={{ height: 'auto', minHeight: 80, padding: '9px 11px', resize: 'vertical' }}
                value={editInfo.description}
                onChange={(e) => setEditInfo({ ...editInfo, description: e.target.value })}
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button type="button" onClick={() => setEditingInfo(false)} className="crm-btn crm-btn-ghost">
              Annuler
            </button>
            <button type="button" onClick={saveInfo} disabled={savingInfo} className="crm-btn crm-btn-primary">
              {savingInfo ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={48} />

              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    margin: '0 0 6px',
                    fontSize: 21,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {company.name}
                </h1>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusDropdown value={company.global_status} onChange={onStatusChange} />

                  {company.sector && (
                    <span
                      style={{
                        height: 26,
                        padding: '0 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {company.sector}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={startEditInfo} className="crm-btn crm-btn-secondary crm-btn-sm">
                Modifier la fiche
              </button>

              <div style={{ position: 'relative' }} ref={moreMenuRef}>
                <button
                  type="button"
                  aria-label="Plus d'actions"
                  title="Plus d'actions"
                  onClick={() => setIsMoreMenuOpen((v) => !v)}
                  className="crm-icon-btn"
                >
                  <IconMore size={15} />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className="crm-dropdown"
                    style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 190, zIndex: 50 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onDeleteClick();
                      }}
                      className="crm-dropdown-item crm-dropdown-item--danger"
                    >
                      Supprimer l'entreprise
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(company.website || company.size || company.description) && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {(company.website || company.size) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: 16,
                  }}
                >
                  {company.website && (
                    <InfoField
                      label="Site web"
                      value={
                        <a
                          href={externalHref(company.website)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent-text)', fontWeight: 500 }}
                        >
                          {company.website} &#8599;
                        </a>
                      }
                    />
                  )}
                  {company.size && <InfoField label="Effectif" value={company.size} />}
                </div>
              )}

              {company.description && (
                <div>
                  <div style={microLabelStyle}>À propos</div>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.55 }}>
                    {company.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={microLabelStyle}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, marginTop: 3 }}>
        {value}
      </div>
    </div>
  );
}

const microLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};