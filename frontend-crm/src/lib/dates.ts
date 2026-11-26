const PARIS_TZ = 'Europe/Paris';

/** Parse une date simple YYYY-MM-DD en heure locale sans décalage UTC. */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Parse un timestamp SQLite/UTC ("YYYY-MM-DD HH:MM:SS" ou ISO). */
export function parseUtcTimestamp(raw?: string | null): Date | null {
  if (!raw) return null;
  const normalized = raw.includes('T')
    ? raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)
      ? raw
      : `${raw}Z`
    : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formate un timestamp UTC en date/heure française (CET/CEST). */
export function formatDateTimeCET(raw?: string | null): string {
  const d = parseUtcTimestamp(raw);
  if (!d) return '—';
  return d.toLocaleString('fr-FR', { timeZone: PARIS_TZ });
}

/** Retourne le YYYY-MM-DD du lundi de la semaine en cours (fuseau Europe/Paris). */
export function getCurrentWeekMondayIso(now = new Date()): string {
  const parisDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const [y, m, d] = parisDateStr.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  const day = current.getDay(); // 0 = dim, 1 = lun, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  current.setDate(current.getDate() - diffToMonday);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
}

/** Nombre de jours écoulés depuis une date YYYY-MM-DD ou un timestamp UTC. */
export function daysSince(raw?: string | null): number {
  if (!raw) return 0;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
  if (isDateOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = parseLocalDate(raw);
    return Math.max(0, Math.floor((today.getTime() - target.getTime()) / 86_400_000));
  }
  const d = parseUtcTimestamp(raw);
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function formatRelativeDate(raw?: string | null): string {
  if (!raw) return '—';
  const days = daysSince(raw);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days}j`;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())
    ? parseLocalDate(raw)
    : parseUtcTimestamp(raw);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}