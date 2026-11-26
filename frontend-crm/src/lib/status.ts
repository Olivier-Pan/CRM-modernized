import { SHARK_STATUS_LABELS, type SharkStatus } from '../types';

export const ALL_STATUSES: SharkStatus[] = [
  'ToContact',
  'Contacted',
  'InDiscussion',
  'VerbalAgreement',
  'Signed',
  'Refused',
  'NoAnswer',
];

export const PIPELINE_STATUSES: SharkStatus[] = [
  'ToContact',
  'Contacted',
  'InDiscussion',
  'VerbalAgreement',
  'Signed',
];

export const INACTIVE_RELANCE_STATUSES: SharkStatus[] = [
  'InDiscussion',
  'NoAnswer',
  'Signed',
  'VerbalAgreement',
  'Refused',
];

export interface StatusVars {
  text: string;
  bg: string;
  border: string;
}

export function getStatusVars(status: string): StatusVars {
  switch (status) {
    case 'Contacted':
      return {
        text: 'var(--status-info-text)',
        bg: 'var(--status-info-bg)',
        border: 'var(--status-info-border)',
      };
    case 'InDiscussion':
      return {
        text: 'var(--status-warning-text)',
        bg: 'var(--status-warning-bg)',
        border: 'var(--status-warning-border)',
      };
    case 'VerbalAgreement':
      return {
        text: 'var(--status-purple-text)',
        bg: 'var(--status-purple-bg)',
        border: 'var(--status-purple-border)',
      };
    case 'Signed':
      return {
        text: 'var(--status-success-text)',
        bg: 'var(--status-success-bg)',
        border: 'var(--status-success-border)',
      };
    case 'Refused':
    case 'NoAnswer':
      return {
        text: 'var(--status-danger-text)',
        bg: 'var(--status-danger-bg)',
        border: 'var(--status-danger-border)',
      };
    default:
      return {
        text: 'var(--status-neutral-text)',
        bg: 'var(--status-neutral-bg)',
        border: 'var(--status-neutral-border)',
      };
  }
}

export function getStatusLabel(status: string): string {
  return SHARK_STATUS_LABELS[status as SharkStatus] || status;
}