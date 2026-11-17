import { useEffect, useRef } from 'react';
import type { Company } from '../types';

// Miroir en lecture seule du formulaire du portail entreprise
// (frontend-registration/src/pages/Registration.tsx) : mêmes sections, libellés,
// options et exemples gris, remplis avec ce que l'entreprise a enregistré. Tout
// changement de champ, de libellé ou d'option côté portail se reporte ici.

const SIZE_OPTIONS = [
  { value: '1-50', label: '1–50 employés' },
  { value: '51-200', label: '51–200 employés' },
  { value: '201-500', label: '201–500 employés' },
  { value: '501-1000', label: '501–1000 employés' },
  { value: '1000+', label: '1000+ employés' },
];

const BOOTH_SIZES = [
  { value: 'CLASSIQUE', label: 'Stand classique' },
  { value: 'PREMIUM', label: 'Stand premium' },
];

const PARTICIPATION_OPTIONS = [
  { key: 'conference', label: 'Conférence' },
  { key: 'workshop', label: 'Workshop / Atelier' },
  { key: 'pitch', label: 'Zone de pitch' },
];

interface Representative {
  name: string;
  role: string;
}

function parseRepresentatives(raw: string | undefined): Representative[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RegistrationFormPreview({ company, onClose }: { company: Company; onClose: () => void }) {
  // Échap ferme la fenêtre ; la page derrière ne défile pas pendant ce temps.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const participation = (company.participation_options || '').split(',').map((s) => s.trim()).filter(Boolean);
  const reps = parseRepresentatives(company.representatives);
  const shownReps = reps.length > 0 ? reps : [{ name: '', role: '' }];
  // Une valeur hors liste (ancienne donnée) s'affiche telle quelle plutôt que de disparaître.
  const sizeOptions = company.size && !SIZE_OPTIONS.some((o) => o.value === company.size)
    ? [...SIZE_OPTIONS, { value: company.size, label: company.size }]
    : SIZE_OPTIONS;
  const boothOptions = company.booth_size && !BOOTH_SIZES.some((o) => o.value === company.booth_size)
    ? [...BOOTH_SIZES, { value: company.booth_size, label: company.booth_size }]
    : BOOTH_SIZES;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="form-preview-title" onClick={onClose} style={backdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={topBarStyle}>
          <span style={{ fontSize: 10, color: '#888', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
            Vue entreprise — lecture seule
          </span>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Fermer le formulaire">
            ✕ Fermer
          </button>
        </div>

        <div style={{ padding: '28px 24px 24px' }}>
          <h1 id="form-preview-title" style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Formulaire d'inscription
          </h1>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 16px' }}>
            Bienvenue, <strong style={{ color: '#0a0a0a' }}>{company.name}</strong>. Complétez vos informations ci-dessous.
          </p>
          <div style={noteStyle}>
            Ce que l'entreprise voit sur son espace, avec ce qu'elle a enregistré. Un champ qui n'affiche que
            l'exemple gris n'a pas été rempli.
          </div>

          <Section title="Identité de l'entreprise">
            <Field label="Nom commercial">
              <input type="text" value={company.name} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#aaa' }} />
            </Field>
            <Field label="Raison sociale">
              <input type="text" value={company.legal_name || ''} readOnly style={inputStyle} placeholder="ex. Dupont Industrie SAS" />
            </Field>
            <Field label="Site web">
              <input type="text" value={company.website || ''} readOnly style={inputStyle} placeholder="www.votre-entreprise.com" />
            </Field>
            <div style={gridStyle}>
              <Field label="Secteur d'activité">
                <input type="text" value={company.sector || ''} readOnly style={inputStyle} placeholder="ex. Conseil, Industrie, Tech..." />
              </Field>
              <Field label="Taille de l'entreprise">
                <select value={company.size || ''} disabled style={selectStyle}>
                  <option value="">Sélectionner</option>
                  {sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description de l'entreprise">
              <textarea value={company.description || ''} readOnly rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Présentez votre entreprise en quelques phrases..." />
            </Field>
            <Field label="URL du logo">
              <input type="text" value={company.logo_url || ''} readOnly style={inputStyle} placeholder="https://... (PNG ou SVG, fond transparent)" />
            </Field>
          </Section>

          <Section title="Contact principal">
            <Field label="Nom du contact">
              <input type="text" value={company.contact_name || ''} readOnly style={inputStyle} placeholder="Prénom Nom" />
            </Field>
            <div style={gridStyle}>
              <Field label="Email professionnel">
                <input type="text" value={company.contact_email || ''} readOnly style={inputStyle} placeholder="prenom.nom@entreprise.com" />
              </Field>
              <Field label="Téléphone">
                <input type="text" value={company.contact_phone || ''} readOnly style={inputStyle} placeholder="+33 6 00 00 00 00" />
              </Field>
            </div>
          </Section>

          <Section title="Options de participation">
            <Field label="Bénéficiez-vous de l'offre couplée Forum CentraleSupélec × Novatech ?">
              <div style={{ display: 'flex', gap: 28, marginTop: 4 }}>
                {[{ value: true, label: 'Oui' }, { value: false, label: 'Non' }].map((opt) => (
                  <span key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="radio" checked={company.novatech_offer === opt.value} readOnly onClick={keepAsIs} style={choiceStyle} aria-label={opt.label} />
                    <span style={{ fontSize: 14, color: '#333' }}>{opt.label}</span>
                  </span>
                ))}
              </div>
            </Field>
            {company.novatech_offer === true && (
              <Field label="Date de signature de votre contrat avec le Forum CentraleSupélec">
                <input type="date" value={company.forum_contract_date || ''} readOnly style={{ ...inputStyle, maxWidth: 240 }} />
              </Field>
            )}
            <Field label="Taille du stand">
              <select value={company.booth_size || ''} disabled style={selectStyle}>
                <option value="">Sélectionner une taille</option>
                {boothOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Options supplémentaires">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {PARTICIPATION_OPTIONS.map((opt) => (
                  <span key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="checkbox" checked={participation.includes(opt.key)} readOnly onClick={keepAsIs} style={choiceStyle} aria-label={opt.label} />
                    <span style={{ fontSize: 14, color: '#333' }}>{opt.label}</span>
                  </span>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Fiche brochure">
            <Field label="Offres proposées (stages, alternances, CDI...)">
              <textarea
                value={company.offers || ''}
                readOnly
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={"ex. Stage de fin d'études en ingénierie logicielle\nAlternance R&D (M1/M2)\nCDI ingénieur data"}
              />
            </Field>
          </Section>

          <Section title="Représentants">
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Personnes qui représenteront votre entreprise le jour J.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shownReps.map((rep, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    {idx === 0 && <div style={colLabelStyle}>Nom</div>}
                    <input type="text" value={rep.name || ''} readOnly style={inputStyle} placeholder="Prénom Nom" />
                  </div>
                  <div style={{ flex: 1 }}>
                    {idx === 0 && <div style={colLabelStyle}>Poste</div>}
                    <input type="text" value={rep.role || ''} readOnly style={inputStyle} placeholder="ex. Directeur RH" />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="Besoins particuliers">
                <textarea
                  value={company.special_needs || ''}
                  readOnly
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Accessibilité, matériel spécifique, contraintes logistiques..."
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// Cases et boutons radio non désactivés (désactivés, ils sont gris pâle et on ne voit plus
// ce qui est coché) : on bloque seulement le clic.
function keepAsIs(e: React.MouseEvent<HTMLInputElement>) {
  e.preventDefault();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '24px 24px 20px', marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(10,10,10,0.55)',
  overflowY: 'auto',
  padding: '40px 16px',
};
const panelStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  background: '#fafafa',
  border: '1px solid #e8e8e8',
  cursor: 'default',
};
const topBarStyle: React.CSSProperties = {
  background: '#0a0a0a',
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};
const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #444',
  color: '#ddd',
  padding: '5px 12px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontFamily: 'inherit',
};
const noteStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#555',
  background: '#fff',
  border: '1px dashed #ddd',
  padding: '10px 14px',
  marginBottom: 20,
  lineHeight: 1.6,
};
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
  fontFamily: 'inherit',
};
// Un <select> désactivé est grisé par défaut : on garde l'aspect du portail.
const selectStyle: React.CSSProperties = { ...inputStyle, opacity: 1, color: '#0a0a0a', appearance: 'auto' };
const choiceStyle: React.CSSProperties = { width: 16, height: 16, accentColor: '#0a0a0a', margin: 0, cursor: 'default' };
const colLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };
