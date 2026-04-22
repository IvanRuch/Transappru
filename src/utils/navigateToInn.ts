/**
 * Navigate to the INN screen with the exact params `useInnBinding` expects.
 *
 * The INN screen serves three distinct flows, differentiated entirely by
 * route params (the hook parses them via `useLocalSearchParams`):
 *
 *   • Register a brand-new organization → `(emptyObj, false)`
 *       isExistingUser=false, checkRnis=false
 *       Button: "Зарегистрироваться"; success → `router.replace('/')` (re-auth).
 *   • Add another organization to an existing session → `(currentUserData, false)`
 *       isExistingUser=true, checkRnis=false
 *       Button: "Добавить"; success → keeps session, shows "заявка зарегистрирована"
 *       modal with the manager phone (from `userData.manager_data`).
 *   • Plain RNIS check → `(emptyObj, true)`
 *       checkRnis=true → only the RNIS vehicle-plate section is shown.
 *
 * Having both sidebars (mobile `useAutoActions.navigateToInn` and web
 * `WebSidebar`) funnel through this helper guarantees the params are
 * identical across platforms — eliminates the class of bug where the web
 * logged users out after "Добавить аккаунт" because params were missing.
 */
export function navigateToInn(
  router: { push: (config: any) => void },
  userData: any,
  checkRnis: boolean,
): void {
  router.push({
    pathname: '/(authenticated)/inn' as any,
    params: {
      user_data: JSON.stringify(userData ?? {}),
      check_rnis: checkRnis ? '1' : '0',
    },
  });
}
