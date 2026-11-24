import React, { useState } from 'react';
import {
  BrochureFormData,
  CONTRACT_LABELS,
  getEffectiveCompanyName,
} from '../types/brochure';

interface Props {
  data: BrochureFormData;
}

export const BrochureLivePreview: React.FC<Props> = ({ data }) => {
  const [compactZoom, setCompactZoom] = useState(false);
 const companyName = getEffectiveCompanyName(data) || 'Nom de votre entreprise';
 const contracts = [
   ...data.contract_types.map((c) => CONTRACT_LABELS[c]),
   ...(data.other_contract_type.trim() ? [data.other_contract_type.trim()] : []),
 ];

 return (
   <aside
     className="preview-sticky"
     style={{
       position: 'sticky',
       top: 84,
       maxHeight: 'calc(100vh - 104px)',
       display: 'flex',
       flexDirection: 'column',
       gap: 10,
     }}
   >
     {/* Barre d'outils fixe au-dessus de l'aperçu */}
     <div
       style={{
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between',
         gap: 8,
         padding: '8px 12px',
         background: 'var(--bg-surface, #fff)',
         border: '1px solid var(--border-subtle, #e5e7eb)',
         borderRadius: 'var(--radius-md, 8px)',
         flexShrink: 0,
       }}
     >
       <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
         Aperçu en direct
       </span>
       <div
         role="group"
         aria-label="Zoom de l'aperçu"
         style={{
           display: 'inline-flex',
           background: 'var(--bg-subtle, #f3f4f6)',
           padding: 2,
           borderRadius: 6,
           gap: 2,
         }}
       >
         <button
           type="button"
           onClick={() => setCompactZoom(false)}
           style={{
             border: 'none',
             borderRadius: 5,
             padding: '3px 9px',
             fontSize: '0.74rem',
             fontWeight: 600,
             cursor: 'pointer',
             background: !compactZoom ? '#fff' : 'transparent',
             color: !compactZoom ? '#111827' : 'var(--text-muted)',
             boxShadow: !compactZoom ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
           }}
         >
           100 %
         </button>
         <button
           type="button"
           onClick={() => setCompactZoom(true)}
           style={{
             border: 'none',
             borderRadius: 5,
             padding: '3px 9px',
             fontSize: '0.74rem',
             fontWeight: 600,
             cursor: 'pointer',
             background: compactZoom ? '#fff' : 'transparent',
             color: compactZoom ? '#111827' : 'var(--text-muted)',
             boxShadow: compactZoom ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
           }}
         >
           Vue globale
         </button>
       </div>
     </div>

     {/* Zone à défilement interne indépendant */}
     <div
       style={{
         overflowY: 'auto',
         overscrollBehavior: 'contain',
         paddingRight: 2,
         borderRadius: 'var(--radius-lg, 12px)',
       }}
     >
       <div
         className="brochure-sheet"
         style={{
           zoom: compactZoom ? 0.78 : 1,
           transition: 'zoom 0.15s ease',
         }}
       >
         <div className="brochure-sheet__eyebrow">
           <span>Aperçu Brochure Étudiants</span>
           <span className="badge badge--neutral">NovaTech</span>
         </div>
         

        <div className="brochure-sheet__header">
          <div className="brochure-sheet__logo-box">
            {data.logo_url ? (
              <img src={data.logo_url} alt={companyName} />
            ) : (
              <span className="brochure-placeholder" style={{ fontSize: '0.7rem' }}>
                Logo
              </span>
            )}
          </div>
          <div>
            <div className="brochure-sheet__company">{companyName}</div>
            <div className="brochure-sheet__tagline">
              {data.sector || <span className="brochure-placeholder">Secteur d'activité</span>}
            </div>
          </div>
        </div>

        {/* Chiffres clés & infos rapides */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px 14px',
            fontSize: '0.8rem',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <strong>Effectif :</strong> {data.headcount || '—'}
          </div>
          <div>
            <strong>Création :</strong> {data.founded_year || '—'}
          </div>
          {data.revenue && (
            <div>
              <strong>CA :</strong> {data.revenue}
            </div>
          )}
          {data.starting_salary && (
            <div>
              <strong>Salaire :</strong> {data.starting_salary}
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Adresse :</strong> {data.address || '—'}
          </div>
          {data.locations && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Implantation :</strong> {data.locations}
            </div>
          )}
          {data.abroad_positions !== null && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Poste à l'étranger :</strong> {data.abroad_positions ? 'Oui' : 'Non'}
            </div>
          )}
        </div>

        <div>
          <div className="brochure-sheet__block-title">Présentation</div>
          <p className="brochure-sheet__body">
            {data.presentation || (
              <span className="brochure-placeholder">
                Votre présentation apparaîtra ici au fil de votre saisie...
              </span>
            )}
          </p>
        </div>

        {contracts.length > 0 && (
          <div>
            <div className="brochure-sheet__block-title">Contrats proposés</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {contracts.map((label) => (
                <span key={label} className="badge badge--accent">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.roles_offered && (
          <div>
            <div className="brochure-sheet__block-title">Métiers</div>
            <p className="brochure-sheet__body">{data.roles_offered}</p>
          </div>
        )}

        {data.sought_profiles && (
          <div>
            <div className="brochure-sheet__block-title">Profils recherchés</div>
            <p className="brochure-sheet__body">{data.sought_profiles}</p>
          </div>
        )}

        {data.recruitment_process && (
          <div>
            <div className="brochure-sheet__block-title">Processus de recrutement</div>
            <p className="brochure-sheet__body">{data.recruitment_process}</p>
          </div>
        )}

        {data.career_progression && (
          <div>
            <div className="brochure-sheet__block-title">Évolution de carrière</div>
            <p className="brochure-sheet__body">{data.career_progression}</p>
          </div>
        )}

        <div className="brochure-sheet__footer">
           <span>{data.website || 'www.entreprise.fr'}</span>
           <span>{data.public_email || data.public_phone || ''}</span>
         </div>
       </div>
     </div>
   </aside>
 );
};