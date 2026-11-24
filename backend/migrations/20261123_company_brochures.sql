-- 1. Ajout du hash de mot de passe portail sur la table companies (si absent)
ALTER TABLE companies ADD COLUMN exhibitor_password_hash TEXT;

-- 2. Table dédiée aux réponses du formulaire exposant
CREATE TABLE IF NOT EXISTS company_brochures (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,

    -- 01. Votre entreprise (partagé élèves)
    custom_company_name TEXT NOT NULL DEFAULT '',
    sector TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    founded_year TEXT NOT NULL DEFAULT '',
    headcount TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    revenue TEXT NOT NULL DEFAULT '',
    starting_salary TEXT NOT NULL DEFAULT '',
    public_email TEXT NOT NULL DEFAULT '',
    public_phone TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    instagram_url TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',

    -- 02. Description de l'offre proposée (partagé élèves)
    presentation TEXT NOT NULL DEFAULT '',
    sought_profiles TEXT NOT NULL DEFAULT '',
    recruitment_process TEXT NOT NULL DEFAULT '',
    roles_offered TEXT NOT NULL DEFAULT '',
    career_progression TEXT NOT NULL DEFAULT '',
    abroad_positions INTEGER, -- NULL = non renseigné, 1 = Oui, 0 = Non
    contract_types TEXT NOT NULL DEFAULT '[]', -- Tableau JSON sérialisé
    other_contract_type TEXT NOT NULL DEFAULT '',
    locations TEXT NOT NULL DEFAULT '',

    -- 03. Contact événement (interne Genius)
    contact_full_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',

    -- 04. Logistique stand & pitch (interne Genius)
    booth_size TEXT NOT NULL DEFAULT '', -- 'standard' | 'premium' | 'custom' | ''
    pitch_zone INTEGER, -- NULL = non renseigné, 1 = Oui, 0 = Non

    -- Gouvernance
    is_locked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
);