/**
 * Module-level tracker for third-party data-provider health.
 *
 * Vehicle data on every screen comes from a per-provider endpoint
 * (`/get-auto-check-{passes,diagnostic-card,fines,osago}`, etc.).
 * Providers are contracted only on endpoint uptime — not data freshness
 * or completeness, and the upstream sources they hit (eKazna, traffic
 * police parsers, ...) go down independently. Until now the frontend
 * silently swallowed every per-provider failure, so clients saw blank
 * fields and assumed the data was "all clear" → trust hit, churn.
 *
 * This module aggregates per-call success/failure into a per-provider
 * state machine (unknown / ok / degraded / down) over a rolling time
 * window. `useDataProviderHealth` and `<DataProviderStatusBanner/>`
 * read from it; the per-loader callsites in `useAutoData` write to it
 * via `reportProviderResult`. No React imports here — pure module so
 * tests are trivial and the API can be called from anywhere.
 *
 * Tuning constants (WINDOW_MS, *_FAILURE_RATE, *_CONSECUTIVE) are
 * deliberately conservative — better to underreport than to cry wolf.
 * Tune after first prod observation; documented in the plan
 * `.claude/plans/2026-04-30-data-provider-health.md`.
 */

export type ProviderId =
  | 'passes'
  | 'diagnostic_card'
  | 'fines'
  | 'osago'
  | 'rnis'
  | 'avtodor';

export type ProviderStatus = 'unknown' | 'ok' | 'degraded' | 'down';

/** Russian labels for the banner. Keep in sync with backend display
 *  conventions when Phase 2 lands. */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  passes: 'пропуска',
  diagnostic_card: 'диагностическая карта',
  fines: 'штрафы ГИБДД',
  osago: 'ОСАГО',
  rnis: 'РНИС',
  avtodor: 'платные дороги',
};

const WINDOW_MS = 60_000;
const DEGRADED_FAILURE_RATE = 0.30;
const DOWN_FAILURE_RATE = 0.80;
const DEGRADED_CONSECUTIVE = 2;
const DOWN_CONSECUTIVE = 3;

interface Sample {
  timestamp: number;
  success: boolean;
}

const samplesByProvider: Map<ProviderId, Sample[]> = new Map();
const listeners = new Set<() => void>();
let lastSnapshot: Record<ProviderId, ProviderStatus> | null = null;

function pruneOld(samples: Sample[], now: number): Sample[] {
  const cutoff = now - WINDOW_MS;
  return samples.filter(s => s.timestamp >= cutoff);
}

function computeStatus(samples: Sample[]): ProviderStatus {
  if (samples.length === 0) return 'unknown';

  // Consecutive-failure check from the most recent sample backwards.
  let consecutiveFails = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].success) break;
    consecutiveFails++;
  }
  if (consecutiveFails >= DOWN_CONSECUTIVE) return 'down';

  // Rolling-window failure rate.
  const fails = samples.reduce((n, s) => n + (s.success ? 0 : 1), 0);
  const failureRate = fails / samples.length;
  if (failureRate >= DOWN_FAILURE_RATE) return 'down';
  if (failureRate >= DEGRADED_FAILURE_RATE) return 'degraded';
  if (consecutiveFails >= DEGRADED_CONSECUTIVE) return 'degraded';
  return 'ok';
}

function buildSnapshot(): Record<ProviderId, ProviderStatus> {
  const now = Date.now();
  const out: Partial<Record<ProviderId, ProviderStatus>> = {};
  (Object.keys(PROVIDER_LABELS) as ProviderId[]).forEach(id => {
    const fresh = pruneOld(samplesByProvider.get(id) ?? [], now);
    samplesByProvider.set(id, fresh);
    out[id] = computeStatus(fresh);
  });
  return out as Record<ProviderId, ProviderStatus>;
}

function snapshotsEqual(
  a: Record<ProviderId, ProviderStatus>,
  b: Record<ProviderId, ProviderStatus>,
): boolean {
  return (Object.keys(a) as ProviderId[]).every(k => a[k] === b[k]);
}

/**
 * Record one per-provider request resolution. Call from every
 * loader's success/error path (including retry exhaustion).
 *
 *   reportProviderResult('fines', !response.data.error);
 *
 * Cheap O(1)+pruning. Notifies subscribers iff a status transition
 * actually happened — no churn re-renders for "still ok".
 */
export function reportProviderResult(provider: ProviderId, success: boolean): void {
  const samples = samplesByProvider.get(provider) ?? [];
  samples.push({ timestamp: Date.now(), success });
  samplesByProvider.set(provider, samples);

  const next = buildSnapshot();
  if (!lastSnapshot || !snapshotsEqual(lastSnapshot, next)) {
    lastSnapshot = next;
    // Snapshot listeners on a copy — a listener may unsubscribe itself.
    [...listeners].forEach(l => l());
  }
}

/**
 * Snapshot of the current per-provider state. Always returns all known
 * providers; default `unknown` for those with no recent samples.
 *
 * For React subscribers prefer `useDataProviderHealth()` — it wires
 * `useSyncExternalStore` and gives a stable reference between
 * unchanged snapshots.
 */
export function getProviderHealth(): Record<ProviderId, ProviderStatus> {
  // Always rebuild — we may be past WINDOW_MS since the last sample.
  lastSnapshot = buildSnapshot();
  return lastSnapshot;
}

/**
 * Subscribe to status-transition events. Returns the unsubscribe fn.
 * Listener fires only when the snapshot actually changes (not on every
 * `reportProviderResult` call).
 */
export function subscribeProviderHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Test-only: clear all samples + listeners + memoised snapshot.
 * Real callers never need this; tests should call it in `beforeEach`
 * to keep cases isolated when the module is shared across files.
 */
export function _resetProviderHealthForTests(): void {
  samplesByProvider.clear();
  listeners.clear();
  lastSnapshot = null;
}
