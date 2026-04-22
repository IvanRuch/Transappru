/**
 * Smoke test — verifies Jest + RNTL infrastructure is wired up.
 * No assertions about business logic here; just "jest can run".
 */
describe('jest infrastructure', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('provides jest globals', () => {
    expect(typeof jest.fn).toBe('function');
    expect(typeof jest.mock).toBe('function');
  });
});
