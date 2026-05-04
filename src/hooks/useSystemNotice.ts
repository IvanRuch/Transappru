/**
 * React subscriber for the backend-driven system-notice banner (ADR-012).
 *
 * Replaces the Phase 1 `useDataProviderHealth` (PR #18, deleted in this
 * PR). The presenter component `<DataProviderStatusBanner />` keeps the
 * same shape — only the source of truth changes.
 *
 * Architecture:
 *   - module-level singleton store (one in-flight poll regardless of
 *     subscriber count, so a single banner mount drives polling);
 *   - `setInterval` ticks every 60s while at least one subscriber is
 *     active, no work when nothing is mounted;
 *   - `useSyncExternalStore` integration with stable derived snapshot
 *     (no churn re-renders when poll returns the same set of notices);
 *   - silent failure: poll errors leave the previous snapshot intact —
 *     better stale than a flicker mid-incident.
 *
 * Why polling and not push: the bot worker writes notices to
 * `payment_db` directly; we'd need WebSocket / SSE infra to invalidate
 * this client. ~1 incident/month cadence and 60s latency are
 * acceptable trade-offs for the simplest possible client wiring.
 */

import { useSyncExternalStore } from 'react';

import { fetchSystemNotice, type SystemNoticeItem } from '../services/dataIssues';
import type { ProviderId } from '../constants/providerLabels';

const POLL_INTERVAL_MS = 60_000;

interface DerivedNotice {
  /** Active notices in arrival order (oldest first), from the API. */
  notices: SystemNoticeItem[];
  /** Categories currently flagged. Computed for the banner presenter. */
  categories: ProviderId[];
  /** True iff at least one notice is active. Banner gate. */
  hasIssues: boolean;
}

const EMPTY: DerivedNotice = Object.freeze({
  notices: [],
  categories: [],
  hasIssues: false,
});

let snapshot: DerivedNotice = EMPTY;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

function buildDerived(notices: SystemNoticeItem[]): DerivedNotice {
  if (notices.length === 0) return EMPTY;
  return {
    notices,
    categories: notices.map(n => n.category),
    hasIssues: true,
  };
}

function snapshotsEqual(a: DerivedNotice, b: DerivedNotice): boolean {
  if (a === b) return true;
  if (a.notices.length !== b.notices.length) return false;
  for (let i = 0; i < a.notices.length; i++) {
    const x = a.notices[i];
    const y = b.notices[i];
    if (
      x.category !== y.category ||
      x.message !== y.message ||
      x.source !== y.source ||
      x.since !== y.since
    ) {
      return false;
    }
  }
  return true;
}

function notify(): void {
  // Snapshot listeners on a copy — a listener may unsubscribe itself
  // synchronously when its component unmounts during the callback.
  [...listeners].forEach(l => l());
}

async function poll(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const notices = await fetchSystemNotice();
    const next = buildDerived(notices);
    if (!snapshotsEqual(snapshot, next)) {
      snapshot = next;
      notify();
    }
  } catch {
    // Silent failure — keep prior snapshot; a transient network error
    // mid-incident must not flap the banner.
  } finally {
    inFlight = false;
  }
}

function startPolling(): void {
  if (pollTimer !== null) return;
  // Kick an immediate fetch so the banner doesn't take 60s to appear
  // when the user opens the app during an active incident.
  void poll();
  pollTimer = setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) startPolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopPolling();
  };
}

function getSnapshot(): DerivedNotice {
  return snapshot;
}

/**
 * Public hook for components. The presenter banner uses
 * `hasIssues` as the visibility gate and `notices` for the message.
 */
export function useSystemNotice(): DerivedNotice {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Test-only: clear store + listeners + timer between cases when the
 * module is shared across test files.
 */
export function _resetSystemNoticeForTests(): void {
  stopPolling();
  listeners.clear();
  snapshot = EMPTY;
  inFlight = false;
}
