import { useSyncExternalStore } from 'react';
import {
  getProviderHealth,
  subscribeProviderHealth,
  PROVIDER_LABELS,
  type ProviderId,
  type ProviderStatus,
} from '../utils/providerHealth';

interface DerivedHealth {
  /** Per-provider snapshot, full map (always all known providers). */
  status: Record<ProviderId, ProviderStatus>;
  /** Providers in `degraded` state. Stable order matching PROVIDER_LABELS. */
  degraded: ProviderId[];
  /** Providers in `down` state. Stable order matching PROVIDER_LABELS. */
  down: ProviderId[];
  /** True iff at least one provider is degraded or down. Banner gate. */
  hasIssues: boolean;
}

const PROVIDER_ORDER = Object.keys(PROVIDER_LABELS) as ProviderId[];

// Cache the last derived value so useSyncExternalStore returns a stable
// reference between unchanged snapshots — required by React 18 to avoid
// "getSnapshot should be cached" warnings.
let cachedSnapshot: Record<ProviderId, ProviderStatus> | null = null;
let cachedDerived: DerivedHealth | null = null;

function snapshotsEqual(
  a: Record<ProviderId, ProviderStatus>,
  b: Record<ProviderId, ProviderStatus>,
): boolean {
  return PROVIDER_ORDER.every(k => a[k] === b[k]);
}

function getSnapshot(): DerivedHealth {
  const status = getProviderHealth();
  if (cachedSnapshot && cachedDerived && snapshotsEqual(cachedSnapshot, status)) {
    return cachedDerived;
  }
  const degraded: ProviderId[] = [];
  const down: ProviderId[] = [];
  PROVIDER_ORDER.forEach(p => {
    if (status[p] === 'degraded') degraded.push(p);
    else if (status[p] === 'down') down.push(p);
  });
  cachedSnapshot = status;
  cachedDerived = {
    status,
    degraded,
    down,
    hasIssues: degraded.length > 0 || down.length > 0,
  };
  return cachedDerived;
}

/**
 * React subscriber for `providerHealth`. Re-renders only when the
 * snapshot actually changes (status transition for at least one
 * provider). Safe to call from many components — they all share the
 * same upstream store.
 *
 * Use cases:
 *   - <DataProviderStatusBanner/> reads `degraded`, `down`, `hasIssues`
 *   - debug screens / drill-down UI read `status`
 */
export function useDataProviderHealth(): DerivedHealth {
  return useSyncExternalStore(subscribeProviderHealth, getSnapshot, getSnapshot);
}
