/**
 * Shared date/time formatters — locale-aware via i18next.
 * Import these instead of defining formatDateTime locally in each page.
 */
import i18n from 'i18next';

function locale(): string {
  return i18n.language?.startsWith('en') ? 'en-GB' : 'it-IT';
}

export function formatDateTime(value?: string | null): string {
  if (!value) return i18n.t('common.dateTBD');
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatDateTimeFull(value?: string | null): string {
  if (!value) return i18n.t('common.dateTBD');
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function formatDay(value?: string | null): string {
  if (!value) return i18n.t('common.dateTBDShort');
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(locale());
}
