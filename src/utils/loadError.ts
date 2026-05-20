/**
 * Classifies axios / network errors raised by `/get-auto-list` into a
 * small set of kinds the UI can react to:
 *   - `timeout`  — server didn't respond within the per-request timeout
 *                  (90s for /get-auto-list, see useAutoData / UserDataContext).
 *   - `network`  — no response received (offline, DNS, TLS, etc).
 *   - `server`   — HTTP 5xx.
 *   - `unknown`  — anything else (HTTP 4xx other than 401 which is handled
 *                  separately by the axios interceptor).
 *
 * 401 must NOT be classified here — the axios interceptor already clears
 * the token and redirects to auth, so the call site should let 401
 * fall through before invoking `classifyLoadError`.
 *
 * Native (React Native) caveat: axios on RN emits `code === 'ERR_NETWORK'`
 * with `message === 'Network Error'` on timeout — the same shape it uses
 * for offline / DNS errors. Web axios cleanly emits `ECONNABORTED` /
 * `'timeout of …ms exceeded'`. To disambiguate, the call site may pass
 * `{ durationMs, timeoutMs }`: an `ERR_NETWORK` error whose duration
 * reached ≥ 90% of the configured timeout is reclassified as `timeout`
 * (the real cause). Without that hint we fall back to `network`. See ADR-024.
 */
export type LoadErrorKind = 'timeout' | 'network' | 'server' | 'unknown';
export type LoadError = { kind: LoadErrorKind; status?: number } | null;

export interface ClassifyOptions {
  durationMs?: number;
  timeoutMs?: number;
}

export function classifyLoadError(error: any, options?: ClassifyOptions): LoadError {
  if (!error) return null;
  if (
    error.code === 'ECONNABORTED'
    || error.code === 'ETIMEDOUT'
    || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))
  ) {
    return { kind: 'timeout' };
  }
  // Native-style timeout disambiguation: axios on RN reports timeouts as
  // ERR_NETWORK + 'Network Error'. If the elapsed time is close to the
  // configured per-request timeout, it's almost certainly a timeout
  // rather than offline / DNS.
  if (
    error.code === 'ERR_NETWORK'
    && options?.durationMs !== undefined
    && options?.timeoutMs !== undefined
    && options.timeoutMs > 0
    && options.durationMs >= 0.9 * options.timeoutMs
  ) {
    return { kind: 'timeout' };
  }
  if (error.response) {
    const status: number = error.response.status;
    if (status >= 500) return { kind: 'server', status };
    return { kind: 'unknown', status };
  }
  if (error.request) return { kind: 'network' };
  return { kind: 'unknown' };
}
