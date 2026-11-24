import React, { useEffect, useState } from 'react';
import {
  clearExhibitorToken,
  fetchExhibitorBrochure,
  getExhibitorToken,
  saveExhibitorBrochure,
  uploadExhibitorLogo,
} from '../api/exhibitor';
import { BrochureForm } from '../components/BrochureForm';
import { BrochureLivePreview } from '../components/BrochureLivePreview';
import { BrochureFormData, getEffectiveCompanyName } from '../types/brochure';

const EMPTY_FORM: BrochureFormData = {
  crm_company_name: '',
  custom_company_name: '',
  sector: '',
  website: '',
  founded_year: '',
  headcount: '',
  address: '',
  revenue: '',
  starting_salary: '',
  public_email: '',
  public_phone: '',
  linkedin_url: '',
  instagram_url: '',
  logo_url: '',
  presentation: '',
  sought_profiles: '',
  recruitment_process: '',
  roles_offered: '',
  career_progression: '',
  abroad_positions: null,
  contract_types: [],
  other_contract_type: '',
  locations: '',
  contact_full_name: '',
  contact_email: '',
  contact_phone: '',
  booth_size: '',
  pitch_zone: null,
};

const REQUIRED_FIELDS: Array<{ key: keyof BrochureFormData; label: string }> = [
  { key: 'sector', label: "Le secteur d'activité est obligatoire." },
  { key: 'website', label: 'Le site web est obligatoire.' },
  { key: 'headcount', label: "L'effectif est obligatoire." },
  { key: 'address', label: "L'adresse est obligatoire." },
  { key: 'presentation', label: "La présentation de l'entreprise est obligatoire." },
  { key: 'contact_full_name', label: 'Le nom et prénom du contact sont obligatoires.' },
  { key: 'contact_email', label: "L'adresse mail du contact est obligatoire." },
  { key: 'contact_phone', label: 'Le téléphone du contact est obligatoire.' },
];

export const Registration: React.FC = () => {
  const [data, setData] = useState<BrochureFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BrochureFormData, string>>>({});
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!getExhibitorToken()) {
      window.location.href = '/login';
      return;
    }

    fetchExhibitorBrochure()
      .then((brochure) => setData({ ...EMPTY_FORM, ...brochure }))
      .catch((err) => {
        setBannerFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Impossible de charger votre dossier.',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const completedRequiredCount = REQUIRED_FIELDS.filter(({ key }) => {
    const val = data[key];
    return typeof val === 'string' && val.trim().length > 0;
  }).length;

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof BrochureFormData, string>> = {};

    for (const { key, label } of REQUIRED_FIELDS) {
      const value = data[key];
      if (typeof value !== 'string' || !value.trim()) {
        nextErrors[key] = label;
      }
    }

    if (data.contact_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email.trim())) {
      nextErrors.contact_email = 'Format d’adresse mail invalide.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    setBannerFeedback(null);
    if (!validate()) {
      setBannerFeedback({
        type: 'error',
        text: 'Certains champs obligatoires (*) sont manquants ou invalides.',
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveExhibitorBrochure(data);
      setData((prev) => ({ ...prev, ...saved }));
      setBannerFeedback({
        type: 'success',
        text: 'Vos informations ont bien été enregistrées et transmises à l’équipe Genius.',
      });
    } catch (err) {
      setBannerFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : "Erreur lors de l'enregistrement.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setBannerFeedback({
        type: 'error',
        text: 'Le fichier logo dépasse la taille maximale autorisée de 5 Mo.',
      });
      return;
    }

    setBannerFeedback(null);
    try {
      const logoUrl = await uploadExhibitorLogo(file);
      setData((prev) => ({ ...prev, logo_url: logoUrl }));
      setBannerFeedback({
        type: 'success',
        text: 'Logo importé avec succès. Pensez à enregistrer votre fiche.',
      });
    } catch (err) {
      setBannerFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : "Échec de l'import du logo.",
      });
    }
  };

  const handleLogout = () => {
    clearExhibitorToken();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <main className="portal-container">
        <p style={{ color: 'var(--text-muted)' }}>Chargement de votre espace exposant...</p>
      </main>
    );
  }

  return (
    <>
      <header className="portal-header">
        <div className="portal-header__inner">
          <div className="portal-brand">
            <span className="portal-brand__title">NovaTech · Espace Exposant</span>
            <span className="portal-brand__subtitle">
              {getEffectiveCompanyName(data) || 'Genius CentraleSupélec'}
            </span>
          </div>

          <div className="portal-header__actions">
            {data.updated_at && (
              <span className="save-indicator">
                Enregistré le {new Date(data.updated_at).toLocaleString('fr-FR')}
              </span>
            )}
            <a href="mailto:contact@genius-cs.fr" className="btn btn-ghost btn-sm">
              Aide
            </a>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="portal-container">
        <div className={`portal-banner ${data.is_locked ? 'portal-banner--locked' : ''}`}>
          <div className="portal-banner__meta">
            <span>
              Dossier : <strong>{data.crm_company_name}</strong>
            </span>
            <span>
              Champs obligatoires :{' '}
              <strong>
                {completedRequiredCount} / {REQUIRED_FIELDS.length}
              </strong>
            </span>
          </div>

          {data.is_locked ? (
            <span className="badge badge--warning">Saisie clôturée (lecture seule)</span>
          ) : completedRequiredCount === REQUIRED_FIELDS.length ? (
            <span className="badge badge--success">Dossier complet</span>
          ) : (
            <span className="badge badge--neutral">En cours de rédaction</span>
          )}
        </div>

        {bannerFeedback && (
          <div
            className={`alert ${
              bannerFeedback.type === 'error' ? 'alert--error' : 'alert--success'
            }`}
            style={{ marginBottom: 20 }}
            role="status"
          >
            <span>{bannerFeedback.text}</span>
          </div>
        )}

        <div className="portal-grid">
          <BrochureForm
            data={data}
            onChange={setData}
            onSave={handleSave}
            onUploadLogo={handleUploadLogo}
            saving={saving}
            errors={errors}
          />
          <BrochureLivePreview data={data} />
        </div>
      </main>
    </>
  );
};