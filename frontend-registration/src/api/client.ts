const BASE_URL = '/api';

export function getToken(): string | null {
  return localStorage.getItem('genius_company_token');
}

export function setToken(token: string): void {
  localStorage.setItem('genius_company_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('genius_company_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  // Les appels publics (skipAuth) ne doivent jamais rediriger vers /login :
  // le visiteur du formulaire de contact n'a pas de session.
  if (response.status === 401 && !skipAuth) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expirée');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
