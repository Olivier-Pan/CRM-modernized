/**
 * Portail d'inscription entreprises. Une seule source de verite : si le domaine
 * change, c'est la seule ligne a toucher.
 */
export const REGISTRATION_URL = 'https://entreprise.genius-cs.fr';

const SIGNATURE_ORG = 'Genius CentraleSupélec';

/** Au-dela, certains clients mail (Outlook/Windows) tronquent le mailto. */
const MAILTO_SAFE_LENGTH = 1900;

export interface ExhibitorMailInput {
  companyName: string;
  companyPassword: string;
  editionName?: string;
  contactName?: string;
  /** Repli quand contactName est vide : le prenom vient de l'email. */
  contactEmail?: string;
  senderName?: string;
  /** Repli quand senderName est vide : le prenom vient de l'email. */
  senderEmail?: string;
  deadline?: string; // 'yyyy-mm-dd'
}

export interface ExhibitorMail {
  subject: string;
  body: string;
  /** Champs restes en placeholder [xxx] — a signaler au shark avant envoi. */
  missing: string[];
}

export function firstName(full?: string): string | undefined {
  const trimmed = (full || '').trim();
  return trimmed ? trimmed.split(/\s+/)[0] : undefined;
}

/**
 * Prenom deduit d'une adresse email, quand aucun nom n'est renseigne.
 * pierre.battistella@student-cs.fr -> Pierre
 */
export function firstNameFromEmail(email?: string): string | undefined {
  const local = (email || '').trim().split('@')[0];
  const first = local.split(/[._\-+]/).filter(Boolean)[0];
  if (!first) return undefined;
  // Une adresse purement numerique ne donne pas un prenom credible.
  if (!/[a-zA-ZÀ-ÿ]/.test(first)) return undefined;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Prenom depuis le nom complet, a defaut depuis l'email. */
export function firstNameOrFromEmail(full?: string, email?: string): string | undefined {
  return firstName(full) || firstNameFromEmail(email);
}

/** Parse 'yyyy-mm-dd' en date LOCALE : new Date('2026-10-06') est en UTC → J-1. */
export function parseISODate(value?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((value || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** '6 octobre 2026' — et '1er octobre 2026' le premier du mois. */
export function formatFrenchDate(value?: string): string | undefined {
  const d = parseISODate(value);
  if (!d) return undefined;
  const day = d.getDate() === 1 ? '1er' : String(d.getDate());
  return `${day} ${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
}

/**
 * Deux semaines avant l'evenement — la regle deja annoncee aux entreprises sur
 * le portail d'inscription. Sans date d'edition : J+14. Jamais dans le passe.
 */
export function defaultDeadline(eventDate?: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const event = parseISODate(eventDate);
  let target: Date;
  if (event) {
    target = new Date(event);
    target.setDate(target.getDate() - 14);
  } else {
    target = new Date(today);
    target.setDate(target.getDate() + 14);
  }

  if (target.getTime() <= today.getTime()) {
    target = new Date(today);
    target.setDate(target.getDate() + 7);
  }
  return toISODate(target);
}

export function buildExhibitorMail(input: ExhibitorMailInput): ExhibitorMail {
  const missing: string[] = [];

  let edition = input.editionName?.trim();
  if (!edition) {
    edition = '[Édition]';
    missing.push("le nom de l'édition");
  }

  let prenom = firstNameOrFromEmail(input.contactName, input.contactEmail);
  if (!prenom) {
    prenom = '[Prénom]';
    missing.push('le prénom du contact');
  }

  let signature = firstNameOrFromEmail(input.senderName, input.senderEmail);
  if (!signature) {
    signature = '[Ton prénom]';
    missing.push('ton prénom');
  }

  let deadline = formatFrenchDate(input.deadline);
  if (!deadline) {
    deadline = '[date limite]';
    missing.push('la date limite');
  }

  const subject = `${edition} — votre espace exposant`;

  // RFC 6068 : les sauts de ligne du corps doivent etre des CRLF. On les ecrit
  // en \r\n et encodeURIComponent produit %0D%0A. Ne jamais pre-encoder ici :
  // on obtiendrait %250D%250A et le shark verrait le code brut dans son mail.
  const body = [
    `Bonjour ${prenom},`,
    '',
    `Ravi de vous compter parmi nous pour ${edition} !`,
    '',
    `Pour finaliser votre participation, merci de compléter votre fiche exposant ici : ${REGISTRATION_URL}`,
    '',
    `    Identifiant : ${input.companyName}`,
    `    Mot de passe : ${input.companyPassword}`,
    '',
    `Comptez 10 minutes. Vous pourrez y revenir et modifier vos réponses autant de fois que nécessaire jusqu'au ${deadline}.`,
    '',
    'Je reste votre contact pour toute question.',
    `${signature} — ${SIGNATURE_ORG}`,
  ].join('\r\n');

  return { subject, body, missing };
}

export function buildMailtoUrl(to: string | undefined, mail: ExhibitorMail): string {
  // encodeURIComponent echappe \r \n ? & = et l'espace : impossible d'injecter
  // un en-tete via un contact_email saisi a la main dans le CRM.
  // On remet le @ en clair : %40 est legal (RFC 6068) mais casse de vieux Outlook.
  const recipient = to && to.trim() ? encodeURIComponent(to.trim()).replace(/%40/g, '@') : '';

  const query =
    `subject=${encodeURIComponent(mail.subject)}` + `&body=${encodeURIComponent(mail.body)}`;

  // Destinataire vide = mailto:?subject=... : valide, ouvre un brouillon sans « À ».
  return `mailto:${recipient}?${query}`;
}

export function isMailtoTooLong(url: string): boolean {
  return url.length > MAILTO_SAFE_LENGTH;
}
