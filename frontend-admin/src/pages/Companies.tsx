import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { Company, Edition } from '../types';
import { SHARK_STATUS_LABELS } from '../types';

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterEdition, setFilterEdition] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEditionId, setNewEditionId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newSector, setNewSector] = useState('');

  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      apiFetch<Company[]>('/companies'),
      apiFetch<Edition[]>('/editions'),
    ])
      .then(([companies, editions]) => {
        setCompanies(companies);
        setEditions(editions);
        const active = editions.find((e) => e.is_active);
        if (active) setNewEditionId(active.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newEditionId) { alert('Sélectionnez une édition'); return; }
    setCreating(true);
    try {
      const newCompany = await apiFetch<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify({
          edition_id: newEditionId,
          name: newName,
          contact_name: newContactName || undefined,
          contact_email: newContactEmail || undefined,
          sector: newSector || undefined,
        }),
      });
      setCompanies((prev) => [...prev, newCompany]);
      setShowCreate(false);
      setNewName(''); setNewContactName(''); setNewContactEmail(''); setNewSector('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer l'entreprise "${name}" ? Cette action est irréversible.`)) return;
    try {
      await apiFetch(`/companies/${id}`, { method: 'DELETE' });
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  function togglePassword(id: string) {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = filterEdition
    ? companies.filter((c) => c.edition_id === filterEdition)
    : companies;

  const getEditionName = (id: string) => editions.find((e) => e.id === id)?.name || id;

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Chargement…</div>;
  if (error) return <div style={{ padding: 40, color: '#f87171' }}>Erreur : {error}</div>;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 4, letterSpacing: '-0.02em' }}>Entreprises</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{filtered.length} entreprise{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterEdition} onChange={(e) => setFilterEdition(e.target.value)} style={filterSelectStyle}>
            <option value="">Toutes les éditions</option>
            {editions.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>+ Nouvelle entreprise</button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>Créer une entreprise</h3>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#aaa' }}>
            Le mot de passe sera généré automatiquement.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input placeholder="Nom de l'entreprise *" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} required />
            <select value={newEditionId} onChange={(e) => setNewEditionId(e.target.value)} style={inputStyle}>
              <option value="">Sélectionner l'édition *</option>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <input placeholder="Contact (optionnel)" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} style={inputStyle} />
            <input placeholder="Email contact" type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Secteur" value={newSector} onChange={(e) => setNewSector(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={creating || !newName || !newEditionId} style={btnPrimaryStyle}>
              {creating ? 'Création…' : 'Créer'}
            </button>
            <button onClick={() => setShowCreate(false)} style={btnSecondaryStyle}>Annuler</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
              <th style={thStyle}>Entreprise</th>
              <th style={thStyle}>Édition</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Mot de passe</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Mise à jour</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucune entreprise</td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: '#0a0a0a' }}>{c.name}</div>
                  {c.sector && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.sector}</div>}
                </td>
                <td style={tdStyle}><span style={{ color: '#555' }}>{getEditionName(c.edition_id)}</span></td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: '#f5f5f5', color: '#555', fontWeight: 500 }}>
                    {SHARK_STATUS_LABELS[c.global_status]}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#333', letterSpacing: 1 }}>
                      {revealedPasswords.has(c.id) ? c.company_password : '••••••••'}
                    </code>
                    <button
                      onClick={() => togglePassword(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 11, fontFamily: 'inherit' }}
                    >
                      {revealedPasswords.has(c.id) ? 'Cacher' : 'Voir'}
                    </button>
                  </div>
                </td>
                <td style={tdStyle}>
                  {c.contact_name && <div style={{ color: '#333' }}>{c.contact_name}</div>}
                  {c.contact_email && <div style={{ fontSize: 11, color: '#aaa' }}>{c.contact_email}</div>}
                </td>
                <td style={{ ...tdStyle, color: '#aaa' }}>{formatDate(c.timestamps.updated_at)}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(c.id, c.name)} style={btnDangerStyle}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

const thStyle: React.CSSProperties = { padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#888', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#0a0a0a', fontFamily: 'inherit' };
const filterSelectStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none' };
const btnPrimaryStyle: React.CSSProperties = { background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const btnSecondaryStyle: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const btnDangerStyle: React.CSSProperties = { background: '#fff', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' };
