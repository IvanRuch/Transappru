/**
 * Unit tests for classifyLoadError — the central error classifier
 * surfaced as `loadError` on useAutoData / UserDataContext and
 * rendered by AutoListLoadError. See ADR-023 (introduction) and
 * ADR-024 (native ERR_NETWORK + duration heuristic, ETIMEDOUT).
 */
import { classifyLoadError } from '../loadError';

describe('classifyLoadError', () => {
  it('returns null for falsy input', () => {
    expect(classifyLoadError(null)).toBeNull();
    expect(classifyLoadError(undefined)).toBeNull();
  });

  it('classifies ECONNABORTED (web axios timeout) as timeout', () => {
    const error = { code: 'ECONNABORTED', message: 'timeout of 90000ms exceeded' };
    expect(classifyLoadError(error)).toEqual({ kind: 'timeout' });
  });

  it('classifies ETIMEDOUT (lower-level socket timeout) as timeout', () => {
    const error = { code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' };
    expect(classifyLoadError(error)).toEqual({ kind: 'timeout' });
  });

  it('classifies message-only "timeout of …ms" as timeout', () => {
    const error = { message: 'Timeout of 60000ms exceeded' };
    expect(classifyLoadError(error)).toEqual({ kind: 'timeout' });
  });

  it('classifies ERR_NETWORK with duration ≥ 90% of timeout as timeout (native)', () => {
    const error = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
      request: {},
    };
    // 88000ms / 90000ms = 97.7% of timeout → treat as timeout.
    expect(
      classifyLoadError(error, { durationMs: 88000, timeoutMs: 90000 }),
    ).toEqual({ kind: 'timeout' });
  });

  it('classifies ERR_NETWORK with short duration as network (real network failure)', () => {
    const error = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
      request: {},
    };
    // 800ms / 90000ms = 0.9% — clearly not a timeout.
    expect(
      classifyLoadError(error, { durationMs: 800, timeoutMs: 90000 }),
    ).toEqual({ kind: 'network' });
  });

  it('classifies ERR_NETWORK without duration hint as network (fallback)', () => {
    const error = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
      request: {},
    };
    expect(classifyLoadError(error)).toEqual({ kind: 'network' });
  });

  it('classifies HTTP 500 as server with status', () => {
    const error = { response: { status: 500, data: {} } };
    expect(classifyLoadError(error)).toEqual({ kind: 'server', status: 500 });
  });

  it('classifies HTTP 503 as server with status', () => {
    const error = { response: { status: 503, data: {} } };
    expect(classifyLoadError(error)).toEqual({ kind: 'server', status: 503 });
  });

  it('classifies HTTP 4xx (non-401) as unknown with status', () => {
    const error = { response: { status: 422, data: { error: 'bad' } } };
    expect(classifyLoadError(error)).toEqual({ kind: 'unknown', status: 422 });
  });

  it('classifies bare request-without-response as network', () => {
    const error = { request: {}, message: 'something' };
    expect(classifyLoadError(error)).toEqual({ kind: 'network' });
  });

  it('classifies a completely unknown error as unknown', () => {
    const error = { message: 'wat' };
    expect(classifyLoadError(error)).toEqual({ kind: 'unknown' });
  });

  it('does not classify ECONNABORTED as anything other than timeout even when duration is short', () => {
    // ECONNABORTED is explicit — duration heuristic should not override.
    const error = { code: 'ECONNABORTED', message: 'timeout' };
    expect(
      classifyLoadError(error, { durationMs: 100, timeoutMs: 90000 }),
    ).toEqual({ kind: 'timeout' });
  });

  it('does not misclassify ERR_NETWORK as timeout when timeoutMs is 0 / missing one of pair', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error', request: {} };
    expect(classifyLoadError(error, { durationMs: 90000, timeoutMs: 0 })).toEqual({ kind: 'network' });
    expect(classifyLoadError(error, { durationMs: 90000 })).toEqual({ kind: 'network' });
    expect(classifyLoadError(error, { timeoutMs: 90000 })).toEqual({ kind: 'network' });
  });
});
