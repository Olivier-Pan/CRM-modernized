import { useState } from 'react';
import { updateInternalRemark } from '../../api/companies';
import { ApiError } from '../../api/client';
import type { Company } from '../../types';

interface InternalRemarkCardProps {
  company: Company;
  onCompanyUpdated: (updated: Company) => void;
}

export default function InternalRemarkCard({
  company,
  onCompanyUpdated,
}: InternalRemarkCardProps) {
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
    <div className="crm-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Remarque interne
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Visible uniquement par l'équipe Genius.
          </div>
        </div>
        {!editingRemark && (
          <button
            type="button"
            onClick={startEditRemark}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            {company.internal_remark ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      {editingRemark ? (
        <div>
          {remarkConflict && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger-text)',
                marginBottom: 10,
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              <strong>Conflit d'édition :</strong> un membre vient de modifier cette note.
              <div style={{ marginTop: 4, fontStyle: 'italic' }}>{remarkConflict}</div>
            </div>
          )}
          <textarea
            className="crm-input"
            value={remarkDraft}
            onChange={(e) => setRemarkDraft(e.target.value)}
            rows={4}
            placeholder="Notes de suivi, préférences de stand, historique..."
            style={{
              height: 'auto',
              padding: '9px 11px',
              resize: 'vertical',
              marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setEditingRemark(false)}
              className="crm-btn crm-btn-ghost crm-btn-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={saveRemark}
              disabled={savingRemark}
              className="crm-btn crm-btn-primary crm-btn-sm"
            >
              {savingRemark ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: company.internal_remark ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {company.internal_remark || 'Aucune remarque enregistrée.'}
        </div>
      )}
    </div>
  );
}