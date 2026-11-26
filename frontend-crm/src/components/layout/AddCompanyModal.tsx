import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany, listCompanies, updateCompany } from '../../api/companies';
import { createContact } from '../../api/contacts';
import { assignShark } from '../../api/sharks';
import { listEditions } from '../../api/editions';
import type { Company } from '../../types';
import AddCompanyContactFields, {
  type OptionalCompanyDetails,
} from './AddCompanyContactFields';
import { IconChevronRight, IconClose } from '../ui/Icons';
interface AddCompanyModalProps {
  open: boolean;
  userId?: string;
  onClose: () => void;
}

const EMPTY_DETAILS: OptionalCompanyDetails = {
  sector: '',
  website: '',
  contactType: 'person',
  firstName: '',
  lastName: '',
  email: '',
  linkedinUrl: '',
  assignToMe: true,
};

export default function AddCompanyModal({ open, userId, onClose }: AddCompanyModalProps) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<OptionalCompanyDetails>(EMPTY_DETAILS);
  const [existingCompanies, setExistingCompanies] = useState<Company[]>([]);
  const [activeEditionId, setActiveEditionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');

    Promise.all([
      listCompanies().catch(() => [] as Company[]),
      listEditions().catch(() => []),
    ]).then(([companies, editions]) => {
      if (cancelled) return;
      setExistingCompanies(companies);
      const active = editions.find((ed) => ed.is_active);
      setActiveEditionId(active?.id || editions[0]?.id || '');
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, submitting, onClose]);

  const potentialDuplicates = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (q.length < 2) return [];
    return existingCompanies
      .filter((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()))
      .slice(0, 3);
  }, [name, existingCompanies]);

  function resetAndClose() {
    setName('');
    setShowDetails(false);
    setDetails(EMPTY_DETAILS);
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await createCompany({ name: cleanName, edition_id: activeEditionId });

      if (details.sector.trim() || details.website.trim()) {
        await updateCompany(created.id, {
          ...(details.sector.trim() ? { sector: details.sector.trim() } : {}),
          ...(details.website.trim() ? { website: details.website.trim() } : {}),
        }).catch(() => undefined);
      }

      const hasContact = Boolean(
        details.firstName.trim() ||
          details.lastName.trim() ||
          details.email.trim() ||
          details.linkedinUrl.trim()
      );

      if (showDetails && hasContact) {
        const contact = await createContact(created.id, {
          contact_type: details.contactType,
          first_name: details.contactType === 'person' ? details.firstName.trim() : '',
          last_name: details.contactType === 'person' ? details.lastName.trim() : '',
          email: details.email.trim() || undefined,
          linkedin_url: details.linkedinUrl.trim() || undefined,
          is_primary: true,
        });

        if (details.assignToMe && userId) {
          await assignShark({
            company_id: created.id,
            contact_id: contact.id,
            member_id: userId,
            contact_method: details.linkedinUrl.trim() && !details.email.trim() ? 'LinkedIn' : 'Email',
          }).catch(() => undefined);
        }
      }

      resetAndClose();
      navigate(`/companies/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'entreprise.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="crm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-company-title"
      onClick={() => !submitting && resetAndClose()}
    >
      <div className="crm-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 id="add-company-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Nouvelle entreprise
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Ajoute une cible à la base de prospection.
            </p>
          </div>
          <button type="button" onClick={resetAndClose} disabled={submitting} className="crm-icon-btn" aria-label="Fermer">
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                background: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger-text)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={fieldLabel}>Nom de l'entreprise *</label>
            <input
              type="text"
              autoFocus
              className="crm-input"
              placeholder="Ex. ActiveViam, Mistral AI..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />

            {potentialDuplicates.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--status-warning-bg)',
                  border: '1px solid var(--status-warning-border)',
                  color: 'var(--status-warning-text)',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Entreprise similaire déjà présente :</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {potentialDuplicates.map((dup) => (
                    <button
                      key={dup.id}
                      type="button"
                      onClick={() => {
                        resetAndClose();
                        navigate(`/companies/${dup.id}`);
                      }}
                      className="crm-btn crm-btn-secondary crm-btn-sm"
                      style={{ height: 24, padding: '0 8px', fontSize: 12 }}
                    >
                      Ouvrir « {dup.name} » &#8599;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--accent-text)',
              fontSize: 12.5,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <IconChevronRight
              size={12}
              style={{ transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s ease' }}
            />
            <span>
              {showDetails
                ? 'Masquer les détails et le 1er contact'
                : 'Ajouter secteur, site web et 1er contact maintenant'}
            </span>
          </button>

          {showDetails && (
            <AddCompanyContactFields
              values={details}
              disabled={submitting}
              canAssign={Boolean(userId)}
              onChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
            />
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button type="button" onClick={resetAndClose} disabled={submitting} className="crm-btn crm-btn-secondary crm-btn-sm">
              Annuler
            </button>
            <button type="submit" disabled={!name.trim() || submitting} className="crm-btn crm-btn-primary crm-btn-sm">
              {submitting ? 'Création…' : 'Créer et ouvrir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-tertiary)',
  marginBottom: 5,
};