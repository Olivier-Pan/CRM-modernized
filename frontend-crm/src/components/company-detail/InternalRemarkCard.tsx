import React, { useState } from 'react';
import { updateInternalRemark } from '../../api/companies';
import { ApiError } from '../../api/client';
import { useTheme } from '../../hooks/useTheme';
import type { Company } from '../../types';
import {
  getCompanyDetailTheme,
  inputStyle,
  btnPrimaryStyle,
  btnSecondaryStyle,
} from './styles';

interface InternalRemarkCardProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
}

export default function InternalRemarkCard({
  company,
  onCompanyUpdated,
}: InternalRemarkCardProps) {
  const theme = useTheme();
  const t = getCompanyDetailTheme(theme);

  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [remarkBase, setRemarkBase] = useState('');
  const [remarkConflict, setRemarkConflict] = useState<string | null>(null);
  const [savingRemark, setSavingRemark] = useState(false);

  function startEditRemark() {
    const current = company.internal_remark ?? '';
    setRemarkBase(current);
    setRemarkDraft(current);
    setRemarkConflict(null);
    setEditingRemark(true);
  }

  async function saveRemark() {
    if (remarkDraft.trim() === remarkBase.trim()) {
      setEditingRemark(false);
      return;
    }
    setSavingRemark(true);
    try {
      const updated = await updateInternalRemark(company.id, remarkDraft, remarkBase);
      onCompanyUpdated(updated);
      setEditingRemark(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { current_internal_remark?: string } | null;
        const current = body?.current_internal_remark ?? '';
        setRemarkBase(current);
        setRemarkConflict(current);
      } else {
        alert(err instanceof Error ? err.message : 'Erreur');
      }
    } finally {
      setSavingRemark(false);
    }
  }

  return (
    <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 32, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textTitle }}>Remarque interne</h2>
          <div style={{ fontSize: 12, color: t.textSubMuted, marginTop: 4 }}>Visible uniquement par l'équipe.</div>
        </div>
        {!editingRemark && (
          <button onClick={startEditRemark} style={btnSecondaryStyle(t)}>
            {company.internal_remark ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      {editingRemark ? (
        <div>
          {remarkConflict && (
            <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>
              Conflit : quelqu'un a modifié la remarque. Sa version :<br />
              <i>{remarkConflict}</i>
            </div>
          )}
          <textarea
            value={remarkDraft}
            onChange={(e) => setRemarkDraft(e.target.value)}
            rows={4}
            style={{ ...inputStyle(t), width: '100%', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveRemark} disabled={savingRemark} style={btnPrimaryStyle}>
              {savingRemark ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button onClick={() => setEditingRemark(false)} style={btnSecondaryStyle(t)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: company.internal_remark ? t.textNormal : t.textSubMuted, whiteSpace: 'pre-wrap' }}>
          {company.internal_remark || 'Aucune remarque.'}
        </div>
      )}
    </div>
  );
}