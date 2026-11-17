import { apiFetch } from './client';
import type { Contact, ContactType } from '../types';

export interface CreateContactPayload {
  contact_type: ContactType;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  is_primary?: boolean;
}

/**
 * Récupère tous les contacts liés à une entreprise spécifique.
 */
export async function listCompanyContacts(companyId: string): Promise<Contact[]> {
  return apiFetch<Contact[]>(`/companies/${companyId}/contacts`);
}

/**
 * Ajoute un nouveau contact à une entreprise.
 */
export async function createContact(companyId: string, data: CreateContactPayload): Promise<Contact> {
  return apiFetch<Contact>(`/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Met à jour un contact existant (ex: le définir comme principal).
 * Note : nécessite l'ajout de la route correspondante côté Rust.
 */
export async function updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Supprime un contact.
 * Note : nécessite l'ajout de la route correspondante côté Rust.
 */
export async function deleteContact(id: string): Promise<void> {
  const response = await fetch(`/api/contacts/${id}`, {
    method: 'DELETE',
    // Ajoute tes headers d'authentification ici si tu en as (ex: Authorization: `Bearer ...`)
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression du contact');
  }

  // On ne fait PAS de response.json() car le backend renvoie 204 No Content (vide)
  return; 
}