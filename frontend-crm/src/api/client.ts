const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('genius_token');
}

export function setToken(token: string): void {
  localStorage.setItem('genius_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('genius_token');
}

/** Erreur HTTP de l'API : garde le statut et le corps JSON, pour les appelants
 *  qui doivent réagir à un cas précis (ex. 409 sur la remarque interne).
 *  `message` reste le champ `error` du corps, comme avant. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
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

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized — redirecting to login');
  }

  if (!response.ok) {
      let errorMessage = 'Erreur inconnue';
      try {
        // On essaie d'abord de lire l'erreur en JSON (ex: { "error": "..." })
        const errorData = await response.clone().json();
        errorMessage = errorData.message || errorData.error || 'Erreur réseau';
      } catch {
        // Si ce n'est pas du JSON, on lit le texte brut renvoyé par Rust
        errorMessage = await response.text();
      }
      throw new Error(errorMessage || 'Erreur inconnue');
    }

  return response.json() as Promise<T>;
}
