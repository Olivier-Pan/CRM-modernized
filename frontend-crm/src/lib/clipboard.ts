/**
 * Copie de texte dans le presse-papier.
 *
 * `navigator.clipboard` n'existe pas hors contexte securise : en prod (HTTPS) et
 * en dev (localhost) tout va bien, mais un acces au VPS par IP en http casse.
 * D'ou le repli sur execCommand.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission refusee ou appel hors geste utilisateur — on tente le repli.
    }
  }

  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  // position:fixed + opacity:0 evite que iOS/Safari scrolle la page.
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  ta.style.fontSize = '16px'; // evite le zoom automatique iOS au focus
  document.body.appendChild(ta);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  ta.select();
  ta.setSelectionRange(0, ta.value.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(ta);
  if (selection && previousRange) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }
  return ok;
}
