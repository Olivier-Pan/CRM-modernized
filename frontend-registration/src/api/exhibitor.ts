import { BrochureFormData } from '../types/brochure';

const TOKEN_KEY = 'novatech_exhibitor_token';

export function getExhibitorToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setExhibitorToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearExhibitorToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getExhibitorToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearExhibitorToken();
    window.location.href = '/login';
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }
  return res.json();
}

export async function loginExhibitor(companyName: string, password: string): Promise<string> {
  const data = await request<{ token: string }>('/api/exhibitor/login', {
    method: 'POST',
    body: JSON.stringify({ company_name: companyName, password }),
  });
  setExhibitorToken(data.token);
  return data.token;
}

export function fetchExhibitorBrochure(): Promise<BrochureFormData> {
  return request<BrochureFormData>('/api/exhibitor/brochure');
}

export function saveExhibitorBrochure(payload: BrochureFormData): Promise<BrochureFormData> {
  return request<BrochureFormData>('/api/exhibitor/brochure', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadExhibitorLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await request<{ logo_url: string }>('/api/exhibitor/logo', {
    method: 'POST',
    body: formData,
  });
  return res.logo_url;
}