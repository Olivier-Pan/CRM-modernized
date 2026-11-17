import { useState, useEffect, FormEvent } from 'react';
import { apiFetch, getToken, clearToken } from '../api/client';
import type { Company, Representative } from '../types';

function getCompanyIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Ce formulaire a un miroir en lecture seule dans le CRM (« Montrer le formulaire ») :
// frontend-crm/src/components/RegistrationFormPreview.tsx. Y reporter tout changement
// de champ, de libellé ou d'option.
const PARTICIPATION_OPTIONS = [
  { key: 'conference', label: 'Conférence' },
  { key: 'workshop', label: 'Workshop / Atelier' },
  { key: 'pitch', label: 'Zone de pitch' },
];

const BOOTH_SIZES = [
  { value: 'CLASSIQUE', label: 'Stand classique' },
  { value: 'PREMIUM', label: 'Stand premium' },
];

function parseParticipationOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Aujourd'hui en AAAA-MM-JJ, heure locale (borne max du champ date). */
function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseRepresentatives(raw: string | undefined): Representative[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function Registration() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [website, setWebsite] = useState('');
  const [sector, setSector] = useState('');
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // null = pas encore répondu
  const [novatechOffer, setNovatechOffer] = useState<boolean | null>(null);
  const [forumContractDate, setForumContractDate] = useState('');

  const [boothSize, setBoothSize] = useState('');
  const [participationOpts, setParticipationOpts] = useState<string[]>([]);

  const [offers, setOffers] = useState('');

  const [representatives, setRepresentatives] = useState<Representative[]>([{ name: '', role: '' }]);
  const [specialNeeds, setSpecialNeeds] = useState('');

  const companyId = getCompanyIdFromToken();

  useEffect(() => {
    if (!companyId) return;
    apiFetch<Company>(`/companies/${companyId}`)
      .then((c) => {
        setCompany(c);
        setName(c.name);
        setLegalName(c.legal_name || '');
        setNovatechOffer(c.novatech_offer ?? null);
        setForumContractDate(c.forum_contract_date || '');
        setWebsite(c.website || '');
        setSector(c.sector || '');
        setSize(c.size || '');
        setDescription(c.description || '');
        setLogoUrl(c.logo_url || '');
        setContactName(c.contact_name || '');
        setContactEmail(c.contact_email || '');
        setContactPhone(c.contact_phone || '');
        setBoothSize(c.booth_size || '');
        setParticipationOpts(parseParticipationOptions(c.participation_options));
        setOffers(c.offers || '');
        const reps = parseRepresentatives(c.representatives);
        setRepresentatives(reps.length > 0 ? reps : [{ name: '', role: '' }]);
        setSpecialNeeds(c.special_needs || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  function toggleParticipation(key: string) {
    setParticipationOpts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function addRepresentative() {
    setRepresentatives((prev) => [...prev, { name: '', role: '' }]);
  }

  function removeRepresentative(idx: number) {
    setRepresentatives((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRepresentative(idx: number, field: keyof Representative, value: string) {
    setRepresentatives((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setError('');
    setSaved(false);

    const repsToSave = representatives.filter((r) => r.name.trim() || r.role.trim());

    try {
      const updated = await apiFetch<Company>(`/companies/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify({
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          website,
          sector,
          size,
          description,
          logo_url: logoUrl,
          offers,
          booth_size: boothSize,
          participation_options: participationOpts.join(','),
          representatives: JSON.stringify(repsToSave),
          special_needs: specialNeeds,
          legal_name: legalName,
          // Absents tant que l'entreprise n'a pas répondu ; la date n'est gardée que si Oui.
          ...(novatechOffer !== null
            ? { novatech_offer: novatechOffer, forum_contract_date: novatechOffer ? forumContractDate : '' }
            : {}),
        }),
      });
      // Le backend complète « obiwe.fr » en « https://obiwe.fr » : afficher la valeur enregistrée.
      setWebsite(updated.website || '');
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <div style={{ color: '#888' }}>Chargement de votre dossier…</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <div style={{ color: '#f87171' }}>Impossible de charger le formulaire. {error}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', padding: '0 0 80px', position: 'relative', overflow: 'hidden' }}>
      {/* Geometric shapes on grey background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        {[...Array(12)].map((_, i) => (
          <line key={`b1-${i}`} x1="0" y1="110" x2={5 + i * 9} y2="-10" stroke="rgba(0,0,0,0.025)" strokeWidth="0.5" />
        ))}
        {[...Array(8)].map((_, i) => (
          <line key={`b2-${i}`} x1="110" y1="55" x2={-10 + i * 14} y2="-10" stroke="rgba(0,0,0,0.018)" strokeWidth="0.5" />
        ))}
      </svg>
      <div style={{ position: 'absolute', top: 80, right: 40, width: 120, height: 120, border: '1px solid rgba(0,0,0,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 94, right: 54, width: 120, height: 120, border: '1px solid rgba(0,0,0,0.025)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 40, width: 90, height: 90, border: '1px solid rgba(0,0,0,0.03)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{
        background: '#0a0a0a',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/genius-logo.png" alt="Genius" style={{ height: 44 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
              Espace Entreprise
            </span>
            <button
              onClick={() => { clearToken(); window.location.href = '/login'; }}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#555',
                padding: '5px 12px',
                borderRadius: 0,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Deconnexion
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 0', position: 'relative' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Formulaire d'inscription
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            Bienvenue, <strong style={{ color: '#0a0a0a' }}>{company.name}</strong>. Complétez vos informations ci-dessous.
          </p>
        </div>

        {/* Deadline banner */}
        <div style={{
          background: '#0a0a0a',
          borderRadius: 0,
          padding: '12px 16px',
          marginBottom: 28,
          fontSize: 13,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          Date limite d'inscription : <strong>2 semaines avant l'evenement.</strong>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Identité ── */}
          <Section title="Identité de l'entreprise">
            <Field label="Nom commercial">
              <input type="text" value={name} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#aaa', cursor: 'not-allowed' }} />
              <div style={hintStyle}>Le nom sous lequel votre entreprise apparaît sur le forum (brochure, stand). Non modifiable — contactez votre chargé de compte Genius.</div>
            </Field>
            <Field label="Raison sociale">
              <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} style={inputStyle} placeholder="ex. Dupont Industrie SAS" />
              <div style={hintStyle}>
                Nom juridique de votre société, tel qu'il figure sur votre extrait Kbis. C'est lui qui apparaîtra sur le contrat et la facture : il peut être différent du nom commercial.
              </div>
            </Field>
            <Field label="Site web">
              {/* Pas de type="url" : le navigateur refuserait « obiwe.fr » sans https://.
                  Il faut juste un point et pas d'espace ; le backend ajoute https://. */}
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                pattern="\S+\.\S+"
                title="Adresse du site, par ex. votre-entreprise.com ou https://www.votre-entreprise.com"
                style={inputStyle}
                placeholder="www.votre-entreprise.com"
              />
            </Field>
            <div style={gridStyle}>
              <Field label="Secteur d'activité">
                <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} style={inputStyle} placeholder="ex. Conseil, Industrie, Tech..." />
              </Field>
              <Field label="Taille de l'entreprise">
                <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
                  <option value="">Sélectionner</option>
                  <option value="1-50">1–50 employés</option>
                  <option value="51-200">51–200 employés</option>
                  <option value="201-500">201–500 employés</option>
                  <option value="501-1000">501–1000 employés</option>
                  <option value="1000+">1000+ employés</option>
                </select>
              </Field>
            </div>
            <Field label="Description de l'entreprise">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Présentez votre entreprise en quelques phrases..."
              />
              <div style={hintStyle}>Publiée dans la brochure et sur le site du forum.</div>
            </Field>
            <Field label="URL du logo">
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} style={inputStyle} placeholder="https://... (PNG ou SVG, fond transparent)" />
            </Field>
          </Section>

          {/* ── Contact ── */}
          <Section title="Contact principal">
            <Field label="Nom du contact">
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} style={inputStyle} placeholder="Prénom Nom" />
            </Field>
            <div style={gridStyle}>
              <Field label="Email professionnel">
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={inputStyle} placeholder="prenom.nom@entreprise.com" />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} style={inputStyle} placeholder="+33 6 00 00 00 00" />
              </Field>
            </div>
          </Section>

          {/* ── Options de participation ── */}
          <Section title="Options de participation">
            <fieldset style={fieldsetStyle}>
              <legend style={{ ...fieldLabelStyle, padding: 0 }}>
                Bénéficiez-vous de l'offre couplée Forum CentraleSupélec × Novatech ?
              </legend>
              <div style={{ display: 'flex', gap: 28, marginTop: 4 }}>
                {[{ value: true, label: 'Oui' }, { value: false, label: 'Non' }].map((opt) => (
                  <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="novatech_offer"
                      checked={novatechOffer === opt.value}
                      onChange={() => setNovatechOffer(opt.value)}
                      style={{ width: 16, height: 16, accentColor: '#0a0a0a', cursor: 'pointer', margin: 0 }}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {novatechOffer === true && (
              <Field label="Date de signature de votre contrat avec le Forum CentraleSupélec">
                <input
                  type="date"
                  value={forumContractDate}
                  onChange={(e) => setForumContractDate(e.target.value)}
                  max={todayIso()}
                  style={{ ...inputStyle, maxWidth: 240 }}
                />
              </Field>
            )}
            <Field label="Taille du stand">
              <select value={boothSize} onChange={(e) => setBoothSize(e.target.value)} style={inputStyle}>
                <option value="">Sélectionner une taille</option>
                {BOOTH_SIZES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <div style={hintStyle}>Les tarifs vous seront communiqués par votre chargé de compte.</div>
            </Field>
            <Field label="Options supplémentaires">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {PARTICIPATION_OPTIONS.map((opt) => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={participationOpts.includes(opt.key)}
                      onChange={() => toggleParticipation(opt.key)}
                      style={{ width: 16, height: 16, accentColor: '#0a0a0a', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ ...hintStyle, marginTop: 8 }}>Tarifs disponibles sur demande auprès de votre chargé de compte.</div>
            </Field>
          </Section>

          {/* ── Fiche brochure ── */}
          <Section title="Fiche brochure">
            <Field label="Offres proposées (stages, alternances, CDI...)">
              <textarea
                value={offers}
                onChange={(e) => setOffers(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={"ex. Stage de fin d'études en ingénierie logicielle\nAlternance R&D (M1/M2)\nCDI ingénieur data"}
              />
              <div style={hintStyle}>Ces informations seront publiées dans la brochure du forum.</div>
            </Field>
          </Section>

          {/* ── Représentants ── */}
          <Section title="Représentants">
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              Personnes qui représenteront votre entreprise le jour J.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {representatives.map((rep, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    {idx === 0 && <div style={colLabelStyle}>Nom</div>}
                    <input
                      type="text"
                      value={rep.name}
                      onChange={(e) => updateRepresentative(idx, 'name', e.target.value)}
                      style={inputStyle}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    {idx === 0 && <div style={colLabelStyle}>Poste</div>}
                    <input
                      type="text"
                      value={rep.role}
                      onChange={(e) => updateRepresentative(idx, 'role', e.target.value)}
                      style={inputStyle}
                      placeholder="ex. Directeur RH"
                    />
                  </div>
                  {representatives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRepresentative(idx)}
                      style={removeButtonStyle}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addRepresentative} style={addButtonStyle}>
              + Ajouter un représentant
            </button>

            <div style={{ marginTop: 16 }}>
              <Field label="Besoins particuliers">
                <textarea
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Accessibilité, matériel spécifique, contraintes logistiques..."
                />
              </Field>
            </div>
          </Section>

          {/* Feedback */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', padding: '12px 16px', borderRadius: 0, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {saved && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a', padding: '12px 16px', borderRadius: 0, fontSize: 13, marginBottom: 16 }}>
              Informations enregistrées avec succès.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              background: saving ? '#333' : '#0a0a0a',
              color: '#fff',
              border: 'none',
              borderRadius: 0,
              padding: '14px',
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer mes informations'}
          </button>

        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 0, padding: '24px 24px 20px', marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
    </label>
  );
}

const fieldLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };
// Un groupe de boutons radio ne peut pas vivre dans le <label> de Field.
const fieldsetStyle: React.CSSProperties = { border: 'none', margin: 0, padding: 0, minWidth: 0 };

const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: 0,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  color: '#0a0a0a',
  background: '#fff',
};

const hintStyle: React.CSSProperties = { fontSize: 12, color: '#aaa', marginTop: 5 };
const colLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };

const addButtonStyle: React.CSSProperties = {
  marginTop: 12,
  background: 'none',
  border: '1px dashed #ddd',
  borderRadius: 0,
  padding: '9px 14px',
  fontSize: 13,
  color: '#888',
  cursor: 'pointer',
  width: '100%',
};

const removeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #e8e8e8',
  borderRadius: 0,
  width: 36,
  height: 40,
  cursor: 'pointer',
  color: '#aaa',
  fontSize: 12,
  flexShrink: 0,
};
