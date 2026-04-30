import {
  reportProviderResult,
  getProviderHealth,
  subscribeProviderHealth,
  _resetProviderHealthForTests,
  PROVIDER_LABELS,
  type ProviderId,
} from '../providerHealth';

beforeEach(() => {
  _resetProviderHealthForTests();
});

describe('providerHealth — pure threshold logic', () => {
  it('returns unknown for every provider when no samples reported', () => {
    const status = getProviderHealth();
    (Object.keys(PROVIDER_LABELS) as ProviderId[]).forEach(id => {
      expect(status[id]).toBe('unknown');
    });
  });

  it('one success → ok', () => {
    reportProviderResult('fines', true);
    expect(getProviderHealth().fines).toBe('ok');
  });

  it('two consecutive failures after a healthy run → degraded (consecutive rule)', () => {
    // Healthy run keeps failure-rate low (so down-by-rate doesn't fire),
    // and the trailing 2 fails trip DEGRADED_CONSECUTIVE.
    for (let i = 0; i < 6; i++) reportProviderResult('fines', true);
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    // 2 fails / 8 samples = 25% — below DEGRADED_FAILURE_RATE (30%);
    // consecutive-rule (2) is what flips this to degraded.
    expect(getProviderHealth().fines).toBe('degraded');
  });

  it('three consecutive failures → down (consecutive rule)', () => {
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    expect(getProviderHealth().fines).toBe('down');
  });

  it('mixed window — failure-rate ≥30% → degraded', () => {
    // 7 ok + 3 fail = 30% failure rate, but interleaved so no
    // 2-consecutive cluster.
    for (let i = 0; i < 10; i++) {
      const isFail = i % 4 === 0;     // i = 0, 4, 8 → 3 fails out of 10
      reportProviderResult('osago', !isFail);
    }
    expect(getProviderHealth().osago).toBe('degraded');
  });

  it('mixed window — failure-rate ≥80% → down', () => {
    // 8 fail + 2 ok in 10 attempts = 80% failure rate.
    for (let i = 0; i < 10; i++) {
      const isOk = i === 5 || i === 7;
      reportProviderResult('osago', isOk);
    }
    expect(getProviderHealth().osago).toBe('down');
  });

  it('one success after long fail-run resets consecutive but leaves rate', () => {
    // 3 fails then 1 success → not down anymore (consecutive broken),
    // but failure rate 75% → still degraded (rate ≥30%, <80%).
    reportProviderResult('passes', false);
    reportProviderResult('passes', false);
    reportProviderResult('passes', false);
    expect(getProviderHealth().passes).toBe('down');
    reportProviderResult('passes', true);
    expect(getProviderHealth().passes).toBe('degraded');
  });

  it('per-provider isolation — one bad provider does not affect others', () => {
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    reportProviderResult('osago', true);
    reportProviderResult('passes', true);

    const status = getProviderHealth();
    expect(status.fines).toBe('down');
    expect(status.osago).toBe('ok');
    expect(status.passes).toBe('ok');
    expect(status.diagnostic_card).toBe('unknown');
  });

  it('rolling window — old samples drop after WINDOW_MS', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-04-30T12:00:00Z'));
      reportProviderResult('rnis', false);
      reportProviderResult('rnis', false);
      reportProviderResult('rnis', false);
      expect(getProviderHealth().rnis).toBe('down');

      // Advance well past the rolling window.
      jest.setSystemTime(new Date('2026-04-30T12:02:00Z'));
      // Reading getProviderHealth() prunes old samples on its own.
      expect(getProviderHealth().rnis).toBe('unknown');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('providerHealth — subscribe/notify', () => {
  it('notifies subscribers on status transition', () => {
    const listener = jest.fn();
    subscribeProviderHealth(listener);

    reportProviderResult('fines', true);          // unknown → ok = transition
    expect(listener).toHaveBeenCalledTimes(1);

    reportProviderResult('fines', true);          // ok → ok = no transition
    expect(listener).toHaveBeenCalledTimes(1);

    reportProviderResult('fines', false);         // ok → ok still (1 fail = 50% over 2 samples = degraded actually)
    // 1 success + 1 fail = 50% failure rate ≥ 30% → degraded
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops notifications', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeProviderHealth(listener);

    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    const before = listener.mock.calls.length;

    unsubscribe();

    reportProviderResult('fines', true);
    expect(listener.mock.calls.length).toBe(before);
  });

  it('listener can unsubscribe itself synchronously without breaking iteration', () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    let unsubscribeB: () => void;

    subscribeProviderHealth(listenerA);
    unsubscribeB = subscribeProviderHealth(() => {
      listenerB();
      unsubscribeB();
    });

    reportProviderResult('fines', false);
    reportProviderResult('fines', false);
    reportProviderResult('fines', false);

    expect(listenerA).toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);
  });
});
