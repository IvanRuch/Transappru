import { navigateToInn } from '../navigateToInn';

describe('navigateToInn util', () => {
  let push: jest.Mock;
  let router: { push: jest.Mock };

  beforeEach(() => {
    push = jest.fn();
    router = { push };
  });

  it('passes empty user_data and check_rnis="0" for new-user registration', () => {
    navigateToInn(router, {}, false);
    expect(push).toHaveBeenCalledWith({
      pathname: '/(authenticated)/inn',
      params: { user_data: '{}', check_rnis: '0' },
    });
  });

  it('serialises current userData for "Add account" (existing user)', () => {
    const current = { inn: '7700000000', firm: 'ООО Ромашка', manager_data: { mobile_phone: '79991112233' } };
    navigateToInn(router, current, false);
    expect(push).toHaveBeenCalledTimes(1);
    const call = push.mock.calls[0][0];
    expect(call.pathname).toBe('/(authenticated)/inn');
    expect(call.params.check_rnis).toBe('0');
    expect(JSON.parse(call.params.user_data)).toEqual(current);
  });

  it('sets check_rnis="1" for RNIS-only flow', () => {
    navigateToInn(router, {}, true);
    expect(push).toHaveBeenCalledWith({
      pathname: '/(authenticated)/inn',
      params: { user_data: '{}', check_rnis: '1' },
    });
  });

  it('tolerates null/undefined userData without throwing', () => {
    navigateToInn(router, null, false);
    expect(push.mock.calls[0][0].params.user_data).toBe('{}');
    navigateToInn(router, undefined, true);
    expect(push.mock.calls[1][0].params.user_data).toBe('{}');
  });
});
