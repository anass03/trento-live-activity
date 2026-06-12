import type { TFunction } from 'i18next';

/**
 * Returns the display title for a citizen-created activity.
 * Backend always generates titles as "Attività di <tipo>" (Italian) — this
 * function derives the locale-aware equivalent from the category key instead.
 */
export function resolveActivityTitle(
  category: string | null | undefined,
  t: TFunction,
): string {
  const cat = t(`categories.${(category ?? '').toLowerCase()}`, {
    defaultValue: category ?? '',
  });
  return t('activities.generatedTitle', { category: cat });
}
