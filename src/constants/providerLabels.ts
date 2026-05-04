/**
 * Single source of truth for the six data categories surfaced in the
 * detail screen. Mirrored on the backend in
 * `payment-service/app/models.py:DATA_CATEGORIES` and CHECK constraints
 * in `migrations/002_data_issues_and_notice.sql`. Keep in sync.
 *
 * Used by:
 *   - `DataProviderStatusBanner` (banner text after `useSystemNotice`)
 *   - `DataIssueReportButton` (category label in the modal)
 */

export type ProviderId =
  | 'passes'
  | 'diagnostic_card'
  | 'fines'
  | 'osago'
  | 'rnis'
  | 'avtodor';

/** Russian display labels — used in banner / modal / push body. */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  passes: 'пропуска',
  diagnostic_card: 'диагностическая карта',
  fines: 'штрафы ГИБДД',
  osago: 'ОСАГО',
  rnis: 'РНИС',
  avtodor: 'платные дороги',
};

/** Stable iteration order — matches backend DATA_CATEGORIES tuple. */
export const PROVIDER_ORDER: readonly ProviderId[] = [
  'passes',
  'diagnostic_card',
  'fines',
  'osago',
  'rnis',
  'avtodor',
];

/** Type guard for runtime category validation (e.g. URL params). */
export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === 'string' &&
    (PROVIDER_ORDER as readonly string[]).includes(value)
  );
}
