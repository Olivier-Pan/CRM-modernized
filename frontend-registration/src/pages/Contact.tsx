import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

const BOOTH_SIZES = [
  { value: 'CLASSIQUE', label: 'Stand classique' },
  { value: 'PREMIUM', label: 'Stand premium' },
];

const PARTICIPATION_OPTIONS = [
  { key: 'conference', label: 'Conférence' },
  { key: 'workshop', label: 'Workshop / Atelier' },
  { key: 'pitch', label: 'Zone de pitch' },
];

interface PublicEdition {
  name: string | null;
  event_date: string | null;
}

export default function Contact() {
  const [edition, setEdition] = useState<PublicEdition | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [boothSize, setBoothSize] = useState('');
  const [participationOpts, setParticipationOpts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  // Honeypot : invisible pour un humain, rempli par la plupart des bots.
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<PublicEdition>('/public/edition', { skipAuth: true })
      .then(setEdition)
      .catch(() => setEdition(null));
  }, []);

  function toggleParticipation(key: string) {
    setParticipationOpts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/public/contact', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone || undefined,
          website: website || undefined,
          sector: sector || undefined,
          booth_size: boothSize || undefined,
          participation_options: participationOpts.join(',') || undefined,
          message: message || undefined,
          company_website_confirm: honeypot,
        }),
      });
      setSent(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      // Le backend masque les erreurs serveur derriere un message generique en
      // anglais : on ne le montre pas tel quel a une entreprise.
      const isServerError = !raw || raw.toLowerCase().includes('internal server error');
      setError(
        isServerError
          ? "Nous n'avons pas pu enregistrer votre demande. Merci de réessayer dans quelques instants."
          : raw
      );
    } finally {
      setSubmitting(false);
    }
  }

  // « au Novatech 2027 » quand l'edition est connue, « a notre prochain forum »
  // sinon : la preposition depend du repli, elle ne peut pas etre codee en dur.
  const participerLabel = edition?.name ? `au ${edition.name}` : 'à notre prochain forum';

  return (
    <div style={pageStyle}>
      {/* Formes geometriques, coherentes avec les autres pages */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {[...Array(12)].map((_, i) => (
          <line key={`b1-${i}`} x1="0" y1="110" x2={5 + i * 9} y2="-10" stroke="rgba(0,0,0,0.025)" strokeWidth="0.5" />
        ))}
        {[...Array(8)].map((_, i) => (
          <line key={`b2-${i}`} x1="110" y1="55" x2={-10 + i * 14} y2="-10" stroke="rgba(0,0,0,0.018)" strokeWidth="0.5" />
        ))}
      </svg>
      <div style={{ position: 'absolute', top: 80, right: 40, width: 120, height: 120, border: '1px solid rgba(0,0,0,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 40, width: 90, height: 90, border: '1px solid rgba(0,0,0,0.03)', pointerEvents: 'none' }} />

      {/* Barre du haut */}
      <div style={topBarStyle}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/genius-logo.png" alt="Genius" style={{ height: 44 }} />
          <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
            Devenir exposant
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 0', position: 'relative' }}>
        {sent ? (
          <div style={cardStyle}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Merci, votre demande est bien enregistrée.
            </h1>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0 }}>
              Un membre de l'équipe Genius reviendra vers vous très prochainement, à l'adresse{' '}
              <strong style={{ color: '#0a0a0a' }}>{contactEmail}</strong>.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 6, letterSpacing: '-0.02em' }}>
                Participer {participerLabel}
              </h1>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                Laissez-nous vos coordonnées : nous revenons vers vous pour construire votre
                participation. Comptez 2 minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Section title="Votre entreprise">
                <Field label="Nom de l'entreprise" required>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    maxLength={200}
                    style={inputStyle}
                    placeholder="Ex : Capgemini"
                  />
                </Field>
                <div style={gridStyle}>
                  <Field label="Secteur">
                    <input value={sector} onChange={(e) => setSector(e.target.value)} maxLength={200} style={inputStyle} placeholder="Conseil, industrie…" />
                  </Field>
                  <Field label="Site web">
                    <input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} style={inputStyle} placeholder="https://…" />
                  </Field>
                </div>
              </Section>

              <Section title="Votre contact">
                <div style={gridStyle}>
                  <Field label="Nom et prénom" required>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} required maxLength={200} style={inputStyle} />
                  </Field>
                  <Field label="Email" required>
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required maxLength={200} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Téléphone">
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={200} style={inputStyle} placeholder="+33 6 00 00 00 00" />
                </Field>
              </Section>

              <Section title="Ce qui vous intéresse">
                <Field label="Taille du stand envisagée">
                  <select value={boothSize} onChange={(e) => setBoothSize(e.target.value)} style={inputStyle}>
                    <option value="">Je ne sais pas encore</option>
                    {BOOTH_SIZES.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <div style={hintStyle}>Les tarifs vous seront communiqués lors de notre échange.</div>
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
                </Field>
                <Field label="Votre message">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Vos attentes, vos questions, les profils que vous recherchez…"
                  />
                </Field>
              </Section>

              {/* Honeypot anti-spam : masque et hors du flux de tabulation. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
                <label>
                  Ne pas remplir
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
              </div>

              {error && (
                <div style={errorStyle}>{error}</div>
              )}

              <button type="submit" disabled={submitting} style={{ ...submitStyle, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Envoi…' : 'Envoyer ma demande'}
              </button>

              <p style={{ fontSize: 12, color: '#aaa', marginTop: 16, lineHeight: 1.6 }}>
                Vous avez déjà un accès exposant ?{' '}
                <Link to="/login" style={{ color: '#0a0a0a', fontWeight: 600 }}>
                  Se connecter
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 20px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={labelStyle}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#fafafa',
  padding: '0 0 80px',
  position: 'relative',
  overflow: 'hidden',
};
const topBarStyle: React.CSSProperties = {
  background: '#0a0a0a',
  padding: '12px 0',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  borderBottom: '1px solid #1a1a1a',
};
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  padding: 24,
  marginBottom: 16,
  position: 'relative',
};
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
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
  fontFamily: 'inherit',
  background: '#fff',
};
const hintStyle: React.CSSProperties = { fontSize: 12, color: '#aaa', marginTop: 5 };
const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#b91c1c',
  padding: '10px 14px',
  fontSize: 13,
  marginBottom: 16,
};
const submitStyle: React.CSSProperties = {
  background: '#0a0a0a',
  color: '#fff',
  border: 'none',
  borderRadius: 0,
  padding: '14px 28px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '0.02em',
};
