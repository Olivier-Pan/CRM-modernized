import React, { useState, useEffect, useRef } from 'react';
import { updateCompany } from '../../api/companies';
import { useTheme } from '../../hooks/useTheme';
import type { Company, SharkStatus } from '../../types';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../../types';
import {
  getCompanyDetailTheme,
  externalHref,
  tagStyle,
  labelStyle,
  inputStyle,
  btnPrimaryStyle,
  btnSecondaryStyle,
  type CompanyDetailTheme,
} from './styles';

const ALL_STATUSES: SharkStatus[] = [
  'ToContact', 'Contacted', 'InDiscussion', 'VerbalAgreement', 'Signed', 'Refused', 'NoAnswer',
];

interface CompanyIdentityCardProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
  onStatusChange: (newStatus: SharkStatus) => Promise<void>;
  onDeleteClick: () => void;
  externalEditTrigger?: number;
}

export default function CompanyIdentityCard({
  company,
  onCompanyUpdated,
  onStatusChange,
  onDeleteClick,
  externalEditTrigger = 0,
}: CompanyIdentityCardProps) {
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

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

  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 24, transition: 'background 0.3s' }}>
      <div style={{ height: 48, background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(249, 115, 22, 0.15))', borderBottom: `1px solid ${t.border}`, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
      <div style={{ padding: '0 32px 32px' }}>
        {editingInfo ? (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textTitle, marginBottom: 16 }}>Modifier l'identité</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              <label style={labelStyle(t.textMuted)}>Nom<input style={inputStyle(t)} value={editInfo.name} onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })} /></label>
              <label style={labelStyle(t.textMuted)}>URL du Logo<input style={inputStyle(t)} value={editInfo.logo_url} onChange={(e) => setEditInfo({ ...editInfo, logo_url: e.target.value })} placeholder="https://..." /></label>
              <label style={labelStyle(t.textMuted)}>Secteur<input style={inputStyle(t)} value={editInfo.sector} onChange={(e) => setEditInfo({ ...editInfo, sector: e.target.value })} /></label>
              <label style={labelStyle(t.textMuted)}>Taille<input style={inputStyle(t)} value={editInfo.size} onChange={(e) => setEditInfo({ ...editInfo, size: e.target.value })} /></label>
              <label style={labelStyle(t.textMuted)}>Site web<input style={inputStyle(t)} value={editInfo.website} onChange={(e) => setEditInfo({ ...editInfo, website: e.target.value })} /></label>
              <label style={{ ...labelStyle(t.textMuted), gridColumn: '1 / -1' }}>
                Description
                <textarea style={{ ...inputStyle(t), resize: 'vertical', minHeight: 80 }} value={editInfo.description} onChange={(e) => setEditInfo({ ...editInfo, description: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={saveInfo} disabled={savingInfo} style={btnPrimaryStyle}>{savingInfo ? 'Sauvegarde…' : 'Sauvegarder les infos'}</button>
              <button onClick={() => setEditingInfo(false)} style={btnSecondaryStyle(t)}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginTop: -24 }}>
            <div style={{ width: 88, height: 88, borderRadius: 16, background: t.bgMain, border: `2px solid ${t.bgCard}`, boxShadow: '0 8px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 800, color: t.textMuted }}>{company.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: t.textTitle, letterSpacing: '-0.03em' }}>{company.name}</h1>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }} ref={statusMenuRef}>
                      <button
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        style={{
                          appearance: 'none',
                          cursor: 'pointer',
                          padding: '6px 28px 6px 14px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 800,
                          border: `1px solid ${SHARK_STATUS_COLORS[company.global_status as SharkStatus]}40`,
                          backgroundColor: `${SHARK_STATUS_COLORS[company.global_status as SharkStatus]}15`,
                          color: SHARK_STATUS_COLORS[company.global_status as SharkStatus],
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          outline: 'none',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {SHARK_STATUS_LABELS[company.global_status as SharkStatus]}
                        <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', transform: isStatusMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </button>
                      {isStatusMenuOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '220px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <style>{`.custom-status-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px; color: ${t.textNormal}; transition: background 0.15s; } .custom-status-item:hover { background: ${t.bgHover}; }`}</style>
                          {ALL_STATUSES.map((s) => (
                            <div key={s} className="custom-status-item" onClick={() => { onStatusChange(s); setIsStatusMenuOpen(false); }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: SHARK_STATUS_COLORS[s], boxShadow: `0 0 0 2px ${SHARK_STATUS_COLORS[s]}33` }} />
                              {SHARK_STATUS_LABELS[s]}
                              {company.global_status === s && (
                                <svg style={{ marginLeft: 'auto', color: SHARK_STATUS_COLORS[s] }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {company.sector && <span style={tagStyle(theme)}>{company.sector}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={startEditInfo} style={btnSecondaryStyle(t)}>Modifier la fiche</button>
                  <button
                    onClick={onDeleteClick}
                    style={{
                      ...btnSecondaryStyle(t),
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {company.website && (
                  <InfoField
                    label="Site Web"
                    value={
                      <a href={externalHref(company.website)} target="_blank" rel="noreferrer" style={{ color: t.primary, textDecoration: 'none', fontWeight: 600 }}>
                        {company.website} ↗
                      </a>
                    }
                    t={t}
                  />
                )}
                {company.size && <InfoField label="Taille" value={company.size} t={t} />}
              </div>
              {company.description && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>À propos</div>
                  <p style={{ margin: 0, color: t.textNormal, fontSize: 14, lineHeight: 1.6 }}>{company.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value, t }: { label: string; value: React.ReactNode; t: CompanyDetailTheme }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: t.textNormal, fontWeight: 500 }}>{value}</div>
    </div>
  );
}