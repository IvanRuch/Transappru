import type { UserData } from '../../types/auto';

/**
 * Factory for `UserData` (the active organization payload).
 *
 * Default values mirror what `/get-auto-list` returns for a confirmed
 * single-org user. Override any field per test:
 *
 *   makeUserData({ user_auto_count: '7', firm: 'ООО Ромашка' })
 *
 * Note: backend ships `user_auto_count` as **string** for `other_user_list`
 * entries and **omits** it entirely on `user_data` (the active org). The
 * factory's default is `undefined` to match that contract — pass an
 * explicit value when you want to simulate a hypothetical fixed backend.
 */
export function makeUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    id: 'user-1',
    firm: 'ООО Тест',
    inn: '7700000001',
    phone: '79991234567',
    user_confirmed: 1,
    phone_inn_confirmed: 1,
    notification_unviewed_count: 0,
    other_user_notification_unviewed_count: 0,
    ...overrides,
  };
}
