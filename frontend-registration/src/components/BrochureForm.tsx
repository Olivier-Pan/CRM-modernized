import React, { useState } from 'react';
import {
  BOOTH_LABELS,
  BoothSize,
  BrochureFormData,
  BrochureSpeaker,
  CONTRACT_LABELS,
  ContractOption,
  MAX_SPEAKERS,
} from '../types/brochure';

interface BrochureFormProps {
  data: BrochureFormData;
  onChange: (next: BrochureFormData) => void;
  onSave: () => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
  saving: boolean;
  errors: Partial<Record<keyof BrochureFormData, string>>;
}

export const BrochureForm: React.FC<BrochureFormProps> = ({
  data,
  onChange,
  onSave,
  onUploadLogo,
  saving,
  errors,
}) => {
  const [otherChecked, setOtherChecked] = useState<boolean>(
    Boolean(data.other_contract_type.trim())
  );
  const disabled = Boolean(data.is_locked);

  const update = <K extends keyof BrochureFormData>(key: K, value: BrochureFormData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const toggleContract = (option: ContractOption) => {
    const exists = data.contract_types.includes(option);
    const next = exists
      ? data.contract_types.filter((item) => item !== option)
      : [...data.contract_types, option];
    update('contract_types', next);
  };

  const speakers = data.speakers.length > 0 ? data.speakers : [{ full_name: '', role: '' }];

  const updateSpeaker = (index: number, field: keyof BrochureSpeaker, value: string) => {
    const next = speakers.map((sp, i) => (i === index ? { ...sp, [field]: value } : sp));
    update('speakers', next);
  };

  const addSpeaker = () => {
    if (speakers.length >= MAX_SPEAKERS) return;
    update('speakers', [...speakers, { full_name: '', role: '' }]);
  };

  const removeSpeaker = (index: number) => {
    if (speakers.length <= 1) {
      update('speakers', [{ full_name: '', role: '' }]);
      return;
    }
    update(
      'speakers',
      speakers.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <form className="portal-main" onSubmit={handleSubmit} noValidate>
      {/* =====================================================================
          01. VOTRE ENTREPRISE (PARTAGÉ ÉLÈVES)
         ===================================================================== */}
      <section className="card">
        <div className="card-header">
          <span className="section-index">01</span>
          <div>
            <h2>Votre entreprise</h2>
            <p className="card-header__desc">
              Informations publiées dans la brochure officielle distribuée aux étudiants.
            </p>
          </div>
        </div>

        <div className="form-stack">
          <div className="form-grid-2">
            <div className="field-group">
              <div className="label-row">
                <label className="field-label">
                  Nom enregistré au forum<span className="field-required">*</span>
                </label>
              </div>
              <input
                type="text"
                className="input"
                value={data.crm_company_name}
                readOnly
                title="Raison sociale enregistrée par l'équipe Genius"
              />
              <span className="field-hint">Nom issu de votre dossier exposant.</span>
            </div>

            <div className="field-group">
              <div className="label-row">
                <label className="field-label" htmlFor="custom_company_name">
                  Autre nom d'affichage (facultatif)
                </label>
              </div>
              <input
                id="custom_company_name"
                type="text"
                className={`input ${errors.custom_company_name ? 'input--error' : ''}`}
                placeholder="Ex. Nom de marque ou filiale..."
                value={data.custom_company_name}
                disabled={disabled}
                onChange={(e) => update('custom_company_name', e.target.value)}
              />
              {errors.custom_company_name ? (
                <span className="field-error">{errors.custom_company_name}</span>
              ) : (
                <span className="field-hint">
                  Remplace le nom ci-contre sur la brochure si renseigné.
                </span>
              )}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="sector">
                Secteur d'activité<span className="field-required">*</span>
              </label>
              <input
                id="sector"
                type="text"
                className={`input ${errors.sector ? 'input--error' : ''}`}
                placeholder="Ex. Conseil en stratégie, DeepTech, Finance..."
                value={data.sector}
                disabled={disabled}
                onChange={(e) => update('sector', e.target.value)}
              />
              {errors.sector && <span className="field-error">{errors.sector}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="website">
                Site web<span className="field-required">*</span>
              </label>
              <input
                id="website"
                type="url"
                className={`input ${errors.website ? 'input--error' : ''}`}
                placeholder="https://www.votre-entreprise.fr"
                value={data.website}
                disabled={disabled}
                onChange={(e) => update('website', e.target.value)}
              />
              {errors.website && <span className="field-error">{errors.website}</span>}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="headcount">
                Effectif<span className="field-required">*</span>
              </label>
              <input
                id="headcount"
                type="text"
                className={`input ${errors.headcount ? 'input--error' : ''}`}
                placeholder="Ex. 45 collaborateurs / 12 000 dans le monde"
                value={data.headcount}
                disabled={disabled}
                onChange={(e) => update('headcount', e.target.value)}
              />
              {errors.headcount && <span className="field-error">{errors.headcount}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="founded_year">
                Année de création
              </label>
              <input
                id="founded_year"
                type="text"
                className="input"
                placeholder="Ex. 2018"
                value={data.founded_year}
                disabled={disabled}
                onChange={(e) => update('founded_year', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="address">
              Adresse<span className="field-required">*</span>
            </label>
            <input
              id="address"
              type="text"
              className={`input ${errors.address ? 'input--error' : ''}`}
              placeholder="Ex. 24 rue du Sentier, 75002 Paris"
              value={data.address}
              disabled={disabled}
              onChange={(e) => update('address', e.target.value)}
            />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="revenue">
                Chiffre d'affaires
              </label>
              <input
                id="revenue"
                type="text"
                className="input"
                placeholder="Ex. 15 M€"
                value={data.revenue}
                disabled={disabled}
                onChange={(e) => update('revenue', e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="starting_salary">
                Salaire à l'embauche
              </label>
              <input
                id="starting_salary"
                type="text"
                className="input"
                placeholder="Ex. 45 – 50 k€ brut annuel"
                value={data.starting_salary}
                disabled={disabled}
                onChange={(e) => update('starting_salary', e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="public_email">
                Mail de contact (candidatures / renseignements)
              </label>
              <input
                id="public_email"
                type="email"
                className="input"
                placeholder="recrutement@entreprise.fr"
                value={data.public_email}
                disabled={disabled}
                onChange={(e) => update('public_email', e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="public_phone">
                Téléphone (candidatures / renseignements)
              </label>
              <input
                id="public_phone"
                type="tel"
                className="input"
                placeholder="01 23 45 67 89"
                value={data.public_phone}
                disabled={disabled}
                onChange={(e) => update('public_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="linkedin_url">
                LinkedIn
              </label>
              <input
                id="linkedin_url"
                type="url"
                className="input"
                placeholder="https://www.linkedin.com/company/..."
                value={data.linkedin_url}
                disabled={disabled}
                onChange={(e) => update('linkedin_url', e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="instagram_url">
                Instagram
              </label>
              <input
                id="instagram_url"
                type="text"
                className="input"
                placeholder="@votreentreprise ou lien"
                value={data.instagram_url}
                disabled={disabled}
                onChange={(e) => update('instagram_url', e.target.value)}
              />
            </div>
          </div>

          {/* Upload Logo HD */}
          <div className="field-group">
            <label className="field-label">Logo haute définition (PNG transparent ou SVG recommandé)</label>
            {!disabled && (
              <label className="dropzone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadLogo(file);
                  }}
                />
                <span>Cliquer pour importer votre logo (PNG, SVG, JPG — max 5 Mo)</span>
              </label>
            )}
            {data.logo_url && (
              <div className="logo-preview-grid">
                <div className="logo-swatch logo-swatch--light">
                  <img src={data.logo_url} alt="Aperçu fond clair" />
                  <span className="logo-swatch__caption">Rendu sur fond blanc</span>
                </div>
                <div className="logo-swatch logo-swatch--dark">
                  <img src={data.logo_url} alt="Aperçu fond sombre" />
                  <span className="logo-swatch__caption">Rendu sur fond sombre</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          02. DESCRIPTION DE L'OFFRE PROPOSÉE (PARTAGÉ ÉLÈVES)
         ===================================================================== */}
      <section className="card">
        <div className="card-header">
          <span className="section-index">02</span>
          <div>
            <h2>Description de l'offre proposée</h2>
            <p className="card-header__desc">
              Contenu éditorial présenté aux élèves-ingénieurs sur votre fiche brochure.
            </p>
          </div>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <div className="label-row">
              <label className="field-label" htmlFor="presentation">
                Présentation de l'entreprise<span className="field-required">*</span>
              </label>
              <span
                className={`char-counter ${
                  data.presentation.length > 900 ? 'char-counter--warn' : ''
                }`}
              >
                {data.presentation.length} / 1000
              </span>
            </div>
            <textarea
              id="presentation"
              rows={5}
              maxLength={1000}
              className={`textarea ${errors.presentation ? 'textarea--error' : ''}`}
              placeholder="Décrivez votre activité, votre mission, vos projets phares et votre culture d'entreprise..."
              value={data.presentation}
              disabled={disabled}
              onChange={(e) => update('presentation', e.target.value)}
            />
            {errors.presentation && <span className="field-error">{errors.presentation}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Types de contrat proposés</label>
            <div className="choice-grid">
              {(Object.keys(CONTRACT_LABELS) as ContractOption[]).map((option) => {
                const checked = data.contract_types.includes(option);
                return (
                  <label
                    key={option}
                    className={`choice-pill ${checked ? 'choice-pill--active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleContract(option)}
                    />
                    <span>{CONTRACT_LABELS[option]}</span>
                  </label>
                );
              })}

              <label className={`choice-pill ${otherChecked ? 'choice-pill--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={otherChecked}
                  disabled={disabled}
                  onChange={(e) => {
                    setOtherChecked(e.target.checked);
                    if (!e.target.checked) update('other_contract_type', '');
                  }}
                />
                <span>Autre</span>
              </label>
            </div>

            {otherChecked && (
              <input
                type="text"
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Précisez le type de contrat (ex. VIE, thèse CIFRE, freelance...)"
                value={data.other_contract_type}
                disabled={disabled}
                onChange={(e) => update('other_contract_type', e.target.value)}
              />
            )}
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="roles_offered">
              Métiers (quels métiers offrez-vous ?)
            </label>
            <textarea
              id="roles_offered"
              rows={3}
              className="textarea"
              placeholder="Ex. Data Scientist, Ingénieur R&D, Consultant stratégie, Product Manager..."
              value={data.roles_offered}
              disabled={disabled}
              onChange={(e) => update('roles_offered', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="sought_profiles">
              Profils recherchés
            </label>
            <textarea
              id="sought_profiles"
              rows={3}
              className="textarea"
              placeholder="Compétences techniques, spécialités appréciées, qualités humaines..."
              value={data.sought_profiles}
              disabled={disabled}
              onChange={(e) => update('sought_profiles', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="recruitment_process">
              Processus de recrutement
            </label>
            <textarea
              id="recruitment_process"
              rows={3}
              className="textarea"
              placeholder="Ex. Entretien RH, étude de cas technique, rencontre avec un manager..."
              value={data.recruitment_process}
              disabled={disabled}
              onChange={(e) => update('recruitment_process', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="career_progression">
              Évolution de carrière
            </label>
            <textarea
              id="career_progression"
              rows={3}
              className="textarea"
              placeholder="Perspectives d'évolution, accompagnement, mobilité interne..."
              value={data.career_progression}
              disabled={disabled}
              onChange={(e) => update('career_progression', e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="locations">
                Implantation (quels pays, quelles villes ?)
              </label>
              <input
                id="locations"
                type="text"
                className="input"
                placeholder="Ex. Paris, Lyon, Londres, Singapour"
                value={data.locations}
                disabled={disabled}
                onChange={(e) => update('locations', e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Poste à l'étranger</label>
              <div className="inline-radio-group">
                {[
                  { label: 'Oui', val: true },
                  { label: 'Non', val: false },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className={`choice-pill ${
                      data.abroad_positions === opt.val ? 'choice-pill--active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="abroad_positions"
                      checked={data.abroad_positions === opt.val}
                      disabled={disabled}
                      onChange={() => update('abroad_positions', opt.val)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          03. VOTRE CONTACT ÉVÉNEMENT (INTERNE GENIUS UNIQUEMENT)
         ===================================================================== */}
      <section className="card">
        <div className="card-header">
          <span className="section-index">03</span>
          <div>
            <h2>Votre contact pour l'organisation</h2>
            <p className="card-header__desc">
              Usage interne Genius uniquement (non publié dans la brochure) pour échanger sur
              l'événement.
            </p>
          </div>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <label className="field-label" htmlFor="contact_full_name">
              Nom et Prénom<span className="field-required">*</span>
            </label>
            <input
              id="contact_full_name"
              type="text"
              className={`input ${errors.contact_full_name ? 'input--error' : ''}`}
              placeholder="Ex. Camille Martin"
              value={data.contact_full_name}
              disabled={disabled}
              onChange={(e) => update('contact_full_name', e.target.value)}
            />
            {errors.contact_full_name && (
              <span className="field-error">{errors.contact_full_name}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="contact_email">
                Mail<span className="field-required">*</span>
              </label>
              <input
                id="contact_email"
                type="email"
                className={`input ${errors.contact_email ? 'input--error' : ''}`}
                placeholder="camille.martin@entreprise.fr"
                value={data.contact_email}
                disabled={disabled}
                onChange={(e) => update('contact_email', e.target.value)}
              />
              {errors.contact_email && (
                <span className="field-error">{errors.contact_email}</span>
              )}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="contact_phone">
                Téléphone<span className="field-required">*</span>
              </label>
              <input
                id="contact_phone"
                type="tel"
                className={`input ${errors.contact_phone ? 'input--error' : ''}`}
                placeholder="06 12 34 56 78"
                value={data.contact_phone}
                disabled={disabled}
                onChange={(e) => update('contact_phone', e.target.value)}
              />
              {errors.contact_phone && (
                <span className="field-error">{errors.contact_phone}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          04. STAND & ZONE DE PITCH (LOGISTIQUE GENIUS)
         ===================================================================== */}
      <section className="card">
        <div className="card-header">
          <span className="section-index">04</span>
          <div>
            <h2>Stand & Zone de pitch</h2>
            <p className="card-header__desc">
              Vos besoins logistiques pour le jour du forum (usage interne Genius).
            </p>
          </div>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <label className="field-label">Taille du stand souhaitée</label>
            <div className="form-stack" style={{ gap: 10 }}>
              {(Object.keys(BOOTH_LABELS) as Exclude<BoothSize, ''>[]).map((size) => {
                const selected = data.booth_size === size;
                return (
                  <label
                    key={size}
                    className={`choice-pill ${selected ? 'choice-pill--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="booth_size"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => update('booth_size', size)}
                    />
                    <div>
                      <strong>{BOOTH_LABELS[size].title}</strong>
                      <span className="choice-pill__desc">{BOOTH_LABELS[size].details}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="field-group">
           <label className="field-label">
             J'aimerais participer à la zone de pitch sur un créneau de 10 minutes{' '}
             <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
               (dans la limite des places disponibles)
             </span>
           </label>
           <span className="field-hint" style={{ display: 'block', marginBottom: 6 }}>
             Sous réserve de disponibilité des créneaux le jour du forum.
           </span>
           <div className="inline-radio-group">
              {[
                { label: 'Oui', val: true },
                { label: 'Non', val: false },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className={`choice-pill ${
                    data.pitch_zone === opt.val ? 'choice-pill--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="pitch_zone"
                    checked={data.pitch_zone === opt.val}
                    disabled={disabled}
                    onChange={() => update('pitch_zone', opt.val)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          05. INTERVENANTS PRÉSENTS LE JOUR DU FORUM (INTERNE GENIUS)
         ===================================================================== */}
      <section className="card">
        <div className="card-header">
          <span className="section-index">05</span>
          <div>
            <h2>Intervenants présents le jour du forum</h2>
            <p className="card-header__desc">
              Indiquez les personnes qui représenteront votre entreprise le jour J (badges et accueil,
              jusqu'à {MAX_SPEAKERS} intervenants).
            </p>
          </div>
        </div>

        <div className="form-stack">
          <div className="rep-list">
            {speakers.map((speaker, idx) => (
              <div key={idx} className="rep-card">
                <div className="rep-card__top">
                  <span>Intervenant {idx + 1}</span>
                  {!disabled && speakers.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger-ghost btn-sm"
                      onClick={() => removeSpeaker(idx)}
                    >
                      Retirer
                    </button>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor={`speaker_name_${idx}`}>
                      Prénom et Nom
                    </label>
                    <input
                      id={`speaker_name_${idx}`}
                      type="text"
                      className="input"
                      placeholder="Ex. Claire Dupont"
                      value={speaker.full_name}
                      disabled={disabled}
                      onChange={(e) => updateSpeaker(idx, 'full_name', e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor={`speaker_role_${idx}`}>
                      Poste occupé
                    </label>
                    <input
                      id={`speaker_role_${idx}`}
                      type="text"
                      className="input"
                      placeholder="Ex. Ingénieure Data / Talent Acquisition"
                      value={speaker.role}
                      disabled={disabled}
                      onChange={(e) => updateSpeaker(idx, 'role', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!disabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addSpeaker}
                disabled={speakers.length >= MAX_SPEAKERS}
              >
                + Ajouter un intervenant
              </button>
              <span className="field-hint tabular">
                {speakers.length} / {MAX_SPEAKERS} intervenants maximum
              </span>
            </div>
          )}
        </div>
      </section>

      {!disabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement en cours...' : 'Enregistrer ma fiche exposant'}
          </button>
        </div>
      )}
    </form>
  );
};