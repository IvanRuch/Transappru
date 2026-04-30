import type { UserData, AutoItem, OurService } from '../../types/auto';
import { makeUserData } from './userData';
import { makeAutoList } from './autoItem';

/**
 * Shape of the `/get-auto-list` response that `useAutoData` reads.
 * Field names mirror the real backend payload exactly. Counts are
 * **strings** because that's how the backend ships them — see
 * probe-org-counts.mjs for empirical evidence.
 */
export interface GetAutoListResponse {
  user_data?: UserData;
  user_list?: UserData[];
  other_user_list?: UserData[];
  manager_data?: Record<string, unknown>;
  our_services_list?: OurService[];
  auto_list?: AutoItem[];
  /** Total cars in the active org. Backend returns a string ("14"). */
  auto_list_count?: string | number;
  /** "0" or 0 → user has not viewed onboarding yet (will be redirected). */
  onboarding_expired?: number | string;
  /** "0" or 0 → show services-announcement modal. */
  announce_our_services_viewed?: number | string;
}

/**
 * Factory for the full `/get-auto-list` response.
 *
 * Default: 3-car active org, no other orgs, onboarding seen, no
 * services announcement. Override any subtree per test:
 *
 *   makeGetAutoListResponse({
 *     auto_list: makeAutoList(10),
 *     auto_list_count: '10',
 *     other_user_list: [makeUserData({ inn: '7700000002', firm: 'Other' })],
 *   })
 */
export function makeGetAutoListResponse(
  overrides: Partial<GetAutoListResponse> = {},
): GetAutoListResponse {
  const autoList = overrides.auto_list ?? makeAutoList(3);
  return {
    user_data: makeUserData(),
    user_list: [],
    other_user_list: [],
    manager_data: {},
    our_services_list: [],
    auto_list: autoList,
    // Default count = matches the list length, as a string (backend
    // contract). Override when testing pagination scenarios.
    auto_list_count: String(overrides.auto_list?.length ?? autoList.length),
    onboarding_expired: 1,
    announce_our_services_viewed: 1,
    ...overrides,
  };
}
