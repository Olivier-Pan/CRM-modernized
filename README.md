# CRM Genius

CRM interne + portail d'inscription pour les forums CentraleSupélec (Genius).

## Architecture

```
backend/               Rust + Axum, port 3001 — API REST, Google Sheets comme DB
frontend-crm/          React + Vite — CRM pour les membres Genius
frontend-registration/ React + Vite — Portail entreprise (formulaire d'inscription)
frontend-admin/        React + Vite — Administration (Olivier)
```

En production, chaque frontend tourne dans son propre conteneur Nginx qui :
- sert les fichiers statiques React (avec fallback SPA)
- proxie `/api` → conteneur `backend:3001` sur le réseau Docker interne

## Stack

- **Backend** : Rust (Axum 0.7), JWT HS256 en mémoire (sessions perdues au redémarrage — volontaire), Google Sheets API v4
- **Base de données** : Google Sheets (1 spreadsheet, 4 onglets : members, companies, sharks, editions)
- **Frontends** : React 18 + Vite, inline styles

---

## Démarrage local

### Prérequis

1. [Rust stable](https://rustup.rs/)
2. [Node.js 20+](https://nodejs.org/)
3. Un service account Google Cloud avec accès en lecture/écriture sur votre spreadsheet

### Google Sheets — Structure des onglets

Créez un Google Spreadsheet avec ces 4 onglets (ligne 1 = en-tête, **ne pas supprimer**) :

**`members`**
```
id | name | email | password_hash | role | created_at
```

**`companies`** (25 colonnes)
```
id | edition_id | name | company_password | contact_name | contact_email | contact_linkedin
website | sector | size | global_status | description | logo_url | created_at | updated_at
contact_phone | offers | booth_size | participation_options | representatives | special_needs
internal_remark | legal_name | novatech_offer | forum_contract_date
```

> ⚠ **Le backend lit les colonnes par position, pas par nom.** Ne jamais insérer, supprimer ni
> déplacer une colonne entre A et Y, ni trier une sous-plage de l'onglet : les données
> glisseraient d'une colonne à l'autre. La colonne **V (`internal_remark`)** est la remarque
> interne de l'équipe : jamais envoyée aux comptes entreprise, écrite uniquement par le backend.
> Au démarrage, le backend écrit l'en-tête `internal_remark` en V1 si la colonne V est vide ; si
> elle est déjà occupée, la remarque reste désactivée (voir les logs). Si l'en-tête
> `internal_remark` n'est plus en V (colonne insérée/supprimée/déplacée), le backend refuse de
> lire ou d'écrire les entreprises dès sa prochaine relecture du Sheet (cache de 30 s au plus),
> jusqu'à correction — l'historique des versions du Sheet permet d'annuler la manipulation.
>
> Les colonnes **W..Y** portent les infos contrat que l'entreprise saisit sur le portail :
> **W `legal_name`** (raison sociale), **X `novatech_offer`** (`oui` / `non` / vide = pas
> répondu, offre couplée Forum CentraleSupélec × Novatech), **Y `forum_contract_date`**
> (`AAAA-MM-JJ`, date de signature du contrat avec le Forum, vidée si l'offre n'est pas `oui`).
> Au démarrage, le backend écrit leurs en-têtes en W1..Y1 si ces colonnes sont entièrement
> vides ; si l'une est déjà occupée, il n'écrit rien et ces trois champs restent désactivés
> (voir les logs). Ils ne sont lus et écrits que tant que W1..Y1 portent exactement ces en-têtes.

**`sharks`**
```
id | member_id | company_id | contact_method | contact_date | status | notes | created_at | updated_at
```

**`editions`**
```
id | year | name | event_date | is_active
```

### Lancer le backend

```bash
cd backend
cp .env.example .env
# Remplir GOOGLE_SHEETS_ID et GOOGLE_SERVICE_ACCOUNT_JSON dans .env
cargo run
# → http://localhost:3001
```

### Lancer les frontends

```bash
cd frontend-crm && npm install && npm run dev          # → http://localhost:5173
cd frontend-registration && npm install && npm run dev # → http://localhost:5174
cd frontend-admin && npm install && npm run dev        # → http://localhost:5175
```

### Créer le premier compte admin

Insérez manuellement dans l'onglet `members` :

```
<uuid>  Olivier Dupont  olivier@genius.fr  <bcrypt_hash>  Admin  2026-01-01T00:00:00Z
```

Pour générer le hash bcrypt :
```bash
htpasswd -bnBC 12 "" monmotdepasse | tr -d ':\n' | sed 's/$2y/$2b/'
```

---

## Déploiement production — Hostinger + Dokploy

### Vue d'ensemble

```
Internet
    │
    ▼
Hostinger VPS (Ubuntu)
    │
    ├── Dokploy (interface de déploiement — port 3000)
    │       └── Traefik (reverse proxy HTTPS — ports 80 / 443)
    │
    └── Docker Compose Stack "crm-genius"
            ├── backend  (Rust :3001, réseau interne uniquement)
            ├── crm      (Nginx :80  → crm.votre-domaine.fr)
            ├── registration (Nginx :80 → inscription.votre-domaine.fr)
            └── admin    (Nginx :80  → admin.votre-domaine.fr)
```

Traefik (géré par Dokploy) termine le TLS et route les requêtes vers le bon conteneur selon le domaine.  
Chaque Nginx proxie `/api/*` vers `http://backend:3001` sur le réseau Docker interne — le backend n'est jamais exposé directement à Internet.

---

### Étape 1 — Préparer le VPS Hostinger

1. Commander un VPS Ubuntu 22.04+ sur Hostinger (4 Go RAM recommandés pour builder Rust).
2. Se connecter en SSH :
   ```bash
   ssh root@<IP_VPS>
   ```
3. Installer Dokploy (une seule commande) :
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
4. Ouvrir `http://<IP_VPS>:3000` dans le navigateur et créer le compte admin Dokploy.

---

### Étape 2 — Configurer les DNS

Dans le gestionnaire DNS de votre domaine (Hostinger ou autre), créer 3 sous-domaines pointant vers l'IP du VPS :

| Sous-domaine | Type | Valeur |
|---|---|---|
| `crm.votre-domaine.fr` | A | `<IP_VPS>` |
| `inscription.votre-domaine.fr` | A | `<IP_VPS>` |
| `admin.votre-domaine.fr` | A | `<IP_VPS>` |

La propagation DNS peut prendre jusqu'à 30 minutes.

---

### Étape 3 — Créer le compte de service Google

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts.
2. Créer un service account (ex. `crm-genius-sheets`).
3. Télécharger la clé JSON.
4. Dans Google Sheets, **partager** le spreadsheet avec l'email du service account (`crm-genius-sheets@<projet>.iam.gserviceaccount.com`) en **Éditeur**.
5. Activer l'API Google Sheets dans la console Google Cloud.

---

### Étape 4 — Créer l'application dans Dokploy

1. Dans Dokploy, créer un nouveau **Project** (ex. "CRM Genius").
2. Dans ce project, cliquer **Create Service → Docker Compose**.
3. Dans l'onglet **General** :
   - Source : **GitHub**
   - Repo : `Genius-CentraleSupelec/CRM2027`
   - Branch : `main`
   - Le fichier `docker-compose.yml` est à la racine — laisser le chemin par défaut.
4. Cliquer **Save**.

---

### Étape 5 — Configurer les variables d'environnement

Dans Dokploy, onglet **Environment** du service Docker Compose, ajouter :

```env
GOOGLE_SHEETS_ID=<l'ID dans l'URL du spreadsheet, entre /d/ et /edit>
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}
JWT_SECRET=<chaîne aléatoire longue, ex. openssl rand -hex 64>
RUST_LOG=info
```

> **Important :** Le JSON du service account doit être sur **une seule ligne** sans retours à la ligne (les `\n` dans la clé privée restent des `\n` littéraux).

Pour vérifier que votre JSON est sur une seule ligne :
```bash
cat service-account.json | tr -d '\n'
```

---

### Étape 6 — Configurer les domaines dans Dokploy

Toujours dans Dokploy, onglet **Domains** (ou **Traefik**) :

| Service | Domaine | Port interne |
|---|---|---|
| `crm` | `crm.votre-domaine.fr` | `80` |
| `registration` | `inscription.votre-domaine.fr` | `80` |
| `admin` | `admin.votre-domaine.fr` | `80` |

Activer **HTTPS / Let's Encrypt** pour chaque domaine (Dokploy le gère automatiquement via Traefik).

Le service `backend` n'a pas de domaine — il reste interne au réseau Docker.

---

### Étape 7 — Premier déploiement

1. Dans Dokploy, cliquer **Deploy** sur le service Docker Compose.
2. Suivre les logs en temps réel dans l'onglet **Logs** — le build Rust prend ~3-5 minutes la première fois (les couches Docker sont ensuite mises en cache).
3. Vérifier que les 4 services passent au statut **Running**.
4. Tester :
   ```bash
   curl https://crm.votre-domaine.fr
   curl https://inscription.votre-domaine.fr
   curl https://admin.votre-domaine.fr
   curl https://crm.votre-domaine.fr/api/health   # doit retourner "ok"
   ```

---

### Déploiements suivants (CD automatique)

Dans Dokploy, activer le **webhook GitHub** dans l'onglet **General** → Auto Deploy.  
Chaque `git push` sur `main` déclenche automatiquement un rebuild et redéploiement.

---

### Commandes utiles en production

```bash
# Voir les logs du backend en live
docker logs -f <nom_conteneur_backend>

# Redémarrer un service sans rebuild
docker restart <nom_conteneur>

# Voir l'état des conteneurs
docker ps

# Forcer un rebuild complet (si cache Docker corrompu)
# → Dans Dokploy : Deploy → "Force rebuild"
```

---

### Checklist avant de mettre en prod

- [ ] DNS configurés et propagés (`ping crm.votre-domaine.fr` répond avec l'IP VPS)
- [ ] Service account Google créé, JSON téléchargé, spreadsheet partagé avec lui
- [ ] Google Sheets créé avec les 4 onglets et leurs 25/6/9/5 colonnes (voir ci-dessus)
- [ ] `JWT_SECRET` long et aléatoire (minimum 64 caractères)
- [ ] Variables d'environnement renseignées dans Dokploy (JSON sur une seule ligne !)
- [ ] Premier compte admin inséré dans l'onglet `members`
- [ ] HTTPS vert sur les 3 sous-domaines
- [ ] `/api/health` répond `ok`
- [ ] Login CRM fonctionnel
- [ ] Login portail entreprise fonctionnel

---

### Sécurité — TODO avant ouverture publique

Dans `backend/src/main.rs`, remplacer le CORS ouvert par les origines explicites :

```rust
// Remplacer :
let cors = CorsLayer::new().allow_origin(Any)...

// Par :
use tower_http::cors::AllowOrigin;
use axum::http::HeaderValue;
let cors = CorsLayer::new()
    .allow_origin([
        "https://crm.votre-domaine.fr".parse::<HeaderValue>().unwrap(),
        "https://inscription.votre-domaine.fr".parse::<HeaderValue>().unwrap(),
        "https://admin.votre-domaine.fr".parse::<HeaderValue>().unwrap(),
    ])
    .allow_methods(Any)
    .allow_headers(Any);
```

---

## API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | /api/auth/login | — | Login membre ou entreprise |
| GET | /api/auth/me | JWT | Infos utilisateur courant |
| GET | /api/health | — | Health check |
| GET | /api/members | Admin/Membre | Liste membres |
| POST | /api/members | Admin | Créer membre |
| PUT | /api/members/:id | Admin | Modifier membre |
| DELETE | /api/members/:id | Admin | Supprimer membre |
| GET | /api/companies | Admin/Membre | Liste entreprises |
| GET | /api/companies/:id | Admin/Membre, ou l'entreprise elle-même | Détail entreprise (l'entreprise ne reçoit ni mdp, ni remarque interne, ni statut CRM, ni dates) |
| POST | /api/companies | Admin/Membre | Créer entreprise (génère mdp auto) |
| PUT | /api/companies/:id | Admin/Membre, ou l'entreprise elle-même | Modifier entreprise (nom : Admin ; statut : Admin/Membre) |
| DELETE | /api/companies/:id | Admin | Supprimer entreprise |
| POST | /api/companies/:id/regenerate-password | Admin, ou shark assigné | Nouveau mot de passe exposant |
| PUT | /api/companies/:id/internal-remark | Admin/Membre | Remarque interne (refus 409 si modifiée entre-temps) |
| GET | /api/sharks | Admin/Membre | Liste sharks |
| GET | /api/sharks/mine | Admin/Membre | Mes sharks |
| POST | /api/sharks | Admin/Membre | S'assigner à une entreprise |
| PUT | /api/sharks/:id | Admin/Membre (owner/admin) | Modifier son shark |
| DELETE | /api/sharks/:id | Admin/Membre (owner/admin) | Se désassigner |
| GET | /api/editions | Admin/Membre | Liste éditions |
| POST | /api/editions | Admin | Créer édition |
| PUT | /api/editions/:id | Admin | Modifier édition |
| PUT | /api/editions/:id/activate | Admin | Activer une édition |
| POST | /api/public/contact | — | Formulaire de contact public (rate limit par IP) |
| GET | /api/public/edition | — | Nom et date de l'édition active |

« Admin/Membre » = token d'un membre Genius ; un token entreprise (portail) y reçoit 401.

## Login entreprise

Les entreprises se connectent avec `{ company_id, password }` au lieu de `{ email, password }`.  
Le `company_password` est en clair dans le Google Sheet et visible dans le panel admin.

## Cache

Les données sont cachées 30 secondes en mémoire pour réduire les appels API Google Sheets (limite : 100 req/100s par utilisateur). Le cache est invalidé à chaque écriture.
