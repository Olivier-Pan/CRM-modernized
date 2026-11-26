import type { Company } from '../types';
import {
  buildExhibitorMail,
  firstNameOrFromEmail,
  formatFrenchDate,
  REGISTRATION_URL,
  type ExhibitorMail,
} from './exhibitorEmail';

const SIGNATURE_ORG = 'Genius CentraleSupélec';

export interface TemplateContext {
  company: Company;
  contactName?: string;
  contactEmail?: string;
  editionName?: string;
  editionEventDate?: string;
  senderName?: string;
  senderEmail?: string;
  deadline?: string;
  lastContactDate?: string;
}

export interface MailTemplate {
  id: string;
  label: string;
  hint: string;
  needsPassword?: boolean;
  build: (ctx: TemplateContext) => ExhibitorMail;
}

class Draft {
  missing: string[] = [];

  need(value: string | undefined, placeholder: string, label: string): string {
    const v = (value || '').trim();
    if (v) return v;
    this.missing.push(label);
    return placeholder;
  }
}

function senderFirstName(d: Draft, ctx: TemplateContext): string {
  return d.need(
    firstNameOrFromEmail(ctx.senderName, ctx.senderEmail),
    '[Ton prénom]',
    'ton prénom'
  );
}

function signature(d: Draft, ctx: TemplateContext): string {
  return `${senderFirstName(d, ctx)} — ${SIGNATURE_ORG}`;
}

function greeting(d: Draft, ctx: TemplateContext): string {
  const who = d.need(
    firstNameOrFromEmail(ctx.contactName, ctx.contactEmail),
    '[Prénom]',
    'le prénom du contact'
  );
  return `Bonjour ${who},`;
}

function edition(d: Draft, ctx: TemplateContext): string {
  return d.need(ctx.editionName, '[Édition]', "le nom de l'édition");
}

export function missingProfileFields(company: Company): string[] {
  const checks: Array<[string | null | undefined, string]> = [
    [company.description, "une description de l'entreprise"],
    [company.logo_url, 'votre logo'],
    [company.sector, "votre secteur d'activité"],
    [company.website, 'votre site web'],
    [company.size, 'votre effectif'],
  ];
  return checks.filter(([v]) => !(v || '').trim()).map(([, label]) => label);
}

const firstContact: MailTemplate = {
  id: 'first-contact',
  label: 'Premier contact',
  hint: "Court, pour décrocher un échange de 15 minutes. Ne contient pas d'identifiants.",
  build: (ctx) => {
    const d = new Draft();
    const ed = edition(d, ctx);
    const when = formatFrenchDate(ctx.editionEventDate);

    const body = [
      greeting(d, ctx),
      '',
      `Je suis ${senderFirstName(d, ctx)}, étudiant à CentraleSupélec et membre de Genius, l'association qui organise ${ed}, notre forum entreprises.`,
      '',
      when
        ? `Nous réunissons chaque année les étudiants de CentraleSupélec et les entreprises qui recrutent, en stage, en alternance et en CDI. ${ed} se tiendra le ${when}.`
        : `Nous réunissons chaque année les étudiants de CentraleSupélec et les entreprises qui recrutent, en stage, en alternance et en CDI.`,
      '',
      `Seriez-vous disponible pour un échange de 15 minutes afin que je vous présente les formats de participation ?`,
      '',
      'Bien cordialement,',
      signature(d, ctx),
    ].join('\r\n');

    return { subject: `${ed} — forum entreprises CentraleSupélec`, body, missing: d.missing };
  },
};

const credentials: MailTemplate = {
  id: 'credentials',
  label: 'Envoyer les identifiants',
  hint: "Contient l'identifiant et le mot de passe du portail exposant.",
  needsPassword: true,
  build: (ctx) =>
    buildExhibitorMail({
      companyName: ctx.company.name,
      companyPassword: (ctx.company.company_password || '').trim(),
      editionName: ctx.editionName,
      contactName: ctx.contactName,
      contactEmail: ctx.contactEmail,
      senderName: ctx.senderName,
      senderEmail: ctx.senderEmail,
      deadline: ctx.deadline,
    }),
};

const followUp: MailTemplate = {
  id: 'follow-up',
  label: 'Relance',
  hint: 'Pour une entreprise restée sans réponse après un premier contact.',
  build: (ctx) => {
    const d = new Draft();
    const ed = edition(d, ctx);
    const since = formatFrenchDate(ctx.lastContactDate);

    const body = [
      greeting(d, ctx),
      '',
      since
        ? `Je me permets de revenir vers vous au sujet de ${ed}, suite à notre échange du ${since}.`
        : `Je me permets de revenir vers vous au sujet de ${ed}, notre forum entreprises à CentraleSupélec.`,
      '',
      'Avez-vous eu l’occasion d’étudier notre proposition ? Je reste disponible pour un échange de 15 minutes, au moment qui vous arrange.',
      '',
      'Bien cordialement,',
      signature(d, ctx),
    ].join('\r\n');

    return { subject: `Relance — ${ed}`, body, missing: d.missing };
  },
};

const incompleteProfile: MailTemplate = {
  id: 'incomplete-profile',
  label: 'Fiche incomplète',
  hint: 'Liste automatiquement les champs encore vides sur la fiche exposant.',
  build: (ctx) => {
    const d = new Draft();
    const ed = edition(d, ctx);
    const gaps = missingProfileFields(ctx.company);
    const deadline = formatFrenchDate(ctx.deadline);

    const lines = [
      greeting(d, ctx),
      '',
      `Merci pour votre participation au ${ed} !`,
      '',
      gaps.length > 0
        ? 'Il manque encore quelques éléments sur votre fiche exposant :'
        : 'Il reste quelques éléments à compléter sur votre fiche exposant.',
    ];

    if (gaps.length > 0) {
      lines.push('');
      gaps.forEach((g) => lines.push(`    - ${g}`));
    }

    lines.push(
      '',
      `Vous pouvez la compléter ici : ${REGISTRATION_URL}`,
      `    Identifiant : ${ctx.company.name}`,
      '    Mot de passe : celui qui vous a été transmis',
      '',
      deadline
        ? `Comptez 5 minutes. Nous avons besoin de ces informations avant le ${deadline}.`
        : 'Comptez 5 minutes.',
      '',
      'Je reste votre contact pour toute question.',
      signature(d, ctx)
    );

    return {
      subject: `${ed} — il manque quelques informations sur votre fiche`,
      body: lines.join('\r\n'),
      missing: d.missing,
    };
  },
};

const signedConfirmation: MailTemplate = {
  id: 'signed-confirmation',
  label: 'Confirmation',
  hint: 'À envoyer quand la participation est actée.',
  build: (ctx) => {
    const d = new Draft();
    const ed = edition(d, ctx);
    const when = formatFrenchDate(ctx.editionEventDate);

    const lines = [
      greeting(d, ctx),
      '',
      when
        ? `C'est confirmé : ${ctx.company.name} sera présente au ${ed}, le ${when}.`
        : `C'est confirmé : ${ctx.company.name} sera présente au ${ed}.`,
      '',
      `Prochaine étape, si ce n'est pas déjà fait : compléter votre fiche exposant sur ${REGISTRATION_URL}`,
      '',
      'Je reste votre contact jusqu’au jour J.',
      signature(d, ctx),
    ];

    return {
      subject: `${ed} — votre participation est confirmée`,
      body: lines.join('\r\n'),
      missing: d.missing,
    };
  },
};

const practicalInfo: MailTemplate = {
  id: 'practical-info',
  label: 'Infos pratiques',
  hint: 'À envoyer peu avant le forum. Vérifie les horaires et l’accès avant d’envoyer.',
  build: (ctx) => {
    const d = new Draft();
    const ed = edition(d, ctx);
    const when = d.need(
      formatFrenchDate(ctx.editionEventDate),
      '[date de l’événement]',
      'la date de l’événement'
    );

    const body = [
      greeting(d, ctx),
      '',
      `${ed} approche ! Voici les informations pratiques pour préparer votre venue.`,
      '',
      `    Date : ${when}`,
      '    Lieu : CentraleSupélec — 3 rue Joliot-Curie, 91190 Gif-sur-Yvette',
      '    Installation des stands : [heure à confirmer]',
      '    Accès et parking : [à compléter]',
      '',
      'Je reste joignable le jour J au [ton numéro].',
      '',
      'À très bientôt,',
      signature(d, ctx),
    ].join('\r\n');

    d.missing.push('les horaires d’installation, l’accès et ton numéro');

    return { subject: `${ed} — informations pratiques`, body, missing: d.missing };
  },
};

export const MAIL_TEMPLATES: MailTemplate[] = [
  firstContact,
  credentials,
  followUp,
  incompleteProfile,
  signedConfirmation,
  practicalInfo,
];