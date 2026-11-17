import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { Edition } from '../types';

export default function Editions() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [newName, setNewName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    loadEditions();
  }, []);

  async function loadEditions() {
    setLoading(true);
    try {
      const data = await apiFetch<Edition[]>('/editions');
      setEditions(data.sort((a, b) => b.year - a.year));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName) { alert('Nom requis'); return; }
    setCreating(true);
    try {
      const edition = await apiFetch<Edition>('/editions', {
        method: 'POST',
        body: JSON.stringify({ year: newYear, name: newName, event_date: newEventDate || undefined }),
      });
      setEditions((prev) => [edition, ...prev]);
      setShowCreate(false);
      setNewName(''); setNewEventDate('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(id: string) {
    if (!confirm('Définir cette édition comme active ? Les autres seront désactivées.')) return;
    setActivating(id);
    try {
      await apiFetch<Edition>(`/editions/${id}/activate`, { method: 'PUT' });
      await loadEditions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActivating(null);
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Chargement…</div>;
  if (error) return <div style={{ padding: 40, color: '#f87171' }}>Erreur : {error}</div>;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 4, letterSpacing: '-0.02em' }}>Éditions</h1>
          <p style={{ fontSize: 13, color: '#888' }}>Gérer les éditions du Novatech</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>+ Nouvelle édition</button>
      </div>

      {showCreate && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>Créer une édition</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <label>
              <div style={labelStyle}>Nom *</div>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Novatech 2027" style={inputStyle} />
            </label>
            <label>
              <div style={labelStyle}>Année *</div>
              <input type="number" value={newYear} onChange={(e) => setNewYear(+e.target.value)} style={inputStyle} />
            </label>
            <label>
              <div style={labelStyle}>Date de l'événement</div>
              <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={creating} style={btnPrimaryStyle}>{creating ? 'Création…' : 'Créer'}</button>
            <button onClick={() => setShowCreate(false)} style={btnSecondaryStyle}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {editions.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 32, color: '#aaa', textAlign: 'center' }}>
            Aucune édition. Créez la première ci-dessus.
          </div>
        )}
        {editions.map((e) => (
          <div
            key={e.id}
            style={{
              background: e.is_active ? '#0a0a0a' : '#fff',
              border: `1px solid ${e.is_active ? '#0a0a0a' : '#e8e8e8'}`,
              borderRadius: 8,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: e.is_active ? '#fff' : '#0a0a0a' }}>{e.name}</span>
                  {e.is_active && (
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 10, background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, letterSpacing: '0.08em' }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: e.is_active ? '#888' : '#aaa', marginTop: 3 }}>
                  Année {e.year}
                  {e.event_date && ` · ${formatDate(e.event_date)}`}
                </div>
                <div style={{ fontSize: 11, color: e.is_active ? '#555' : '#ccc', marginTop: 2 }}>ID : {e.id}</div>
              </div>
              <div>
                {!e.is_active && (
                  <button onClick={() => handleActivate(e.id)} disabled={activating === e.id} style={btnPrimaryStyle}>
                    {activating === e.id ? 'Activation…' : 'Définir comme active'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: '#0a0a0a' };
const btnPrimaryStyle: React.CSSProperties = { background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const btnSecondaryStyle: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
