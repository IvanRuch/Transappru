# Manual QA Checklist — Screen Migration (ADR-003 + ADR-005) + Kazna Payment Flow

Last updated: 2026-04-29.

Full migration of 16 screen pairs to shared hooks + sub-components +
NativeWind + dark-mode tokens is complete. `npx tsc --noEmit` passes
cleanly; 48 unit tests pass. Component-level rendering tests and visual
regression are not automated — this checklist drives manual verification
on all three target platforms.

## Scope

Run the flows below on **each** of these platforms before each release:
- **iOS** (iPhone 15 simulator or device).
- **Android** (Pixel 7 emulator or device).
- **Chrome desktop** (1920px, 1280px, 768px, 375px viewports).

## Global smoke — every screen

Minimum validation on every screen that opens:

- [ ] Back button (`<ScreenHeader>`) works; `safeBack` fallback hits `/main` when history is empty (test via direct URL entry on web).
- [ ] Title is visible and doesn't truncate at 375px width.
- [ ] Primary CTA is focusable via Tab on web.
- [ ] Dark-mode toggle (via user profile, dev-mode) — no white-on-white or black-on-black in any token-backed element.
- [ ] No hardcoded emoji instead of PNG icons (✔/⚠/→/🚛/📍 removed per playbook).
- [ ] No layout shift when switching web viewport between 1280 and 375.

## Critical user flows

### F1. First-time onboarding (Auth → Pin → Onboarding → INN → AutoList)

- [ ] `AuthScreen`: phone field auto-prefixes `+7`; Send disabled until 10 digits + checkbox.
- [ ] Clicking "Пользовательское соглашение" / "Политика конфиденциальности" opens scrollable `DocumentModal`; Esc closes it on web.
- [ ] `PinScreen`: typing 4 digits enables Submit; wrong code shows `ConfirmModal` with "Получить ещё раз" (no Cancel button).
- [ ] Web: Pin has 4 separate single-digit inputs; ArrowLeft/ArrowRight/Backspace work between fields.
- [ ] `OnBoardingScreen`: Next/Skip advances, last slide shows "Начать"; Android asks for location permission exactly once.
- [ ] `InnScreen`: ИНН 10/12 digits enables button; manager-phone tap opens `tel:` on both platforms.

### F2. Pass ordering (AutoList → PassScreen → YaMap → back to Pass)

- [ ] Select 1+ vehicle on AutoList → bottom footer shows "Пропуск в Москву"; web "Сбросить" clears selection.
- [ ] PassScreen: typing 3+ chars shows street autocomplete suggestions.
- [ ] Web: ArrowDown navigates between suggestions; Enter picks focused item; Esc clears the field.
- [ ] Web: inline spinner appears on the right of the input during the autocomplete request.
- [ ] Zone tabs МКАД/ТТК/СК toggle; badges on suggestion cards match (color by zone).
- [ ] "Ранее введён:" block renders **after** its header, not before. (Regression check — earlier bug.)
- [ ] Tap 📍 map button → PassYaMapScreen opens with appropriate zone filter.
  - If address not yet picked: single zone visible, filtered `/get-address-map`.
  - If address already picked (edit mode): all 3 zones, unfiltered `/get-address-map`.
- [ ] Map long-press (mobile) / click (web) resolves address; overlay shows "Определение адреса…" then the address card.
- [ ] "Добавить" commits; PassScreen receives data:
  - Address populated.
  - Zone auto-set from backend response.
  - Manual-zone banner fires on toggling to a different zone.
  - Manual-zone banner **also fires** when the auto-zone came from user-history, not just map (ADR-005 parity fix).
- [ ] Edit mode: "Добавить" is hidden until a new point is tapped (no stale commit).
- [ ] Web: back from PassScreen goes to `/auto-list?mode=pass`, NOT back to `/pass-yamap` (recent bugfix).
- [ ] **Web `/pass-yamap` with DevTools open: zero `Refused to load` / CSP-violation messages in Console; Network tab shows 200 for `api-maps.yandex.ru/v3/...`, `*.api-maps.yandex.ru`, `yastatic.net`, and tile requests to `*.maps.yandex.net`.** (ADR-011 — regression anchor for the 2026-05-04 demo incident.)

### F3. Charges — list + payment (ChargesScreen → PaymentConfirm → WebView → Success)

- [ ] Filter pills (web) / modal panel (mobile) toggle ГИБДД / ПЛАТОН / ФССП / ФНС / все.
- [ ] Group cards expand/collapse; master checkbox selects all items in group.
- [ ] "Показать ещё" in "Другие начисления" section reveals items beyond first 3.
- [ ] Select 1+ charge → footer "Оплатить" shows sum + count.
- [ ] PaymentConfirmScreen: FIO input with error box; receipt Switch toggles.
- [ ] Commission breakdown shows per-type rows when multiple types selected.
- [ ] Discount info: inline box on web, `InfoPopup` modal on mobile — both controlled by same `showDiscountInfo` state.
- [ ] "Оплатить" opens Kazna page in WebView (mobile) / iframe (web).
- [ ] Successful payment redirect → `FinePaymentSuccessScreen` → navigation to AutoList works.

### F4. Driver CRUD (DriverListScreen / AutoDetail tab)

- [ ] Add driver: VU accepts exactly 10 digits; VU_reg auto-formats as `DD.MM.YYYY` (typing `01012020` → `01.01.2020`).
- [ ] Save button disabled until validation passes.
- [ ] Edit existing driver: fields prefilled, Save updates; Delete opens `ConfirmModal` (destructive variant, red button).
- [ ] Deleting navigates back to list without the deleted item.
- [ ] DriversTab inside AutoDetail (web) behaves identically to standalone `/drivers`.

### F5. Notifications (NotificationList + NotificationSettings)

- [ ] Unread notifications show blue dot + subtle background tint (notification-newBg token).
- [ ] Click marks as viewed; blue dot disappears.
- [ ] Mobile: scrolling 75% into an unviewed item also marks it viewed (FlatList viewability).
- [ ] Empty state: "Уведомлений нет" shown on both platforms.
- [ ] Settings: master switch disables per-auto switches (opacity 40%); per-auto switches enable back when master re-enabled.
- [ ] Switch colours match on mobile and web (Graphite #3A3A3A — not green).

### F6. User profile (app/user.tsx / app/user.web.tsx)

- [ ] Organization card shows firm + INN read-only.
- [ ] Add contact: phone auto-prefix `+7`; save disabled until `/^\+7\d{10}$/` regex matches.
- [ ] Edit existing contact: fields prefilled with `phone = '+' + stored_phone`.
- [ ] Delete contact: `ConfirmModal` with danger variant; on success, list refreshes.
- [ ] Logout: `ConfirmModal` primary-variant; token moved to `saved_token_for_return`; routes to `/`.
- [ ] Delete profile: `ConfirmModal` danger variant; account really deleted, routes to `/deleted` (mobile) or `/` (web).
- [ ] Mobile dev-only: theme toggle cycles auto → light → dark; "Clear app data" button wipes AsyncStorage.

## Accessibility spot-checks (web)

Run these on the 5 flagship web screens: Auth, PinScreen, AutoList, PassScreen, PaymentConfirm.

- [ ] Tab order is logical (header → main content → footer actions).
- [ ] All Pressables have `accessibilityLabel` (check via browser devtools Accessibility panel).
- [ ] Lists expose `role="list"` (AutoListItem, NotificationCard, SuggestionItem, ContactCard, DriverCard).
- [ ] Dialogs/modals: `role="dialog"` + `accessibilityViewIsModal`; Esc closes; overlay click closes; focus returns to trigger on close.
- [ ] Combobox (PassScreen address input): `aria-expanded`, `aria-controls`, `aria-activedescendant` present when list is open.
- [ ] Screen reader: VoiceOver (Safari) or NVDA (Firefox) reads: "Водители, список из N элементов", "Начисления от ДД.ММ, X рублей, кнопка", etc.
- [ ] Keyboard-only navigation of PassScreen autocomplete: ArrowDown/Up/Enter/Esc all work.
- [ ] No `<Text>` with `text-[10px]` or similar below 12px for body content.
- [ ] Colour contrast: accent (#C9A86B), status-error (#EE505A), status-success (#40882C) all pass AA against their backgrounds.

## Regression anchors (known past bugs)

- [ ] Web `<WebAppLayout>` double-wrap (8 instances fixed during migration): no screen renders two sidebars.
- [ ] `PassScreen.web` back navigation goes to `/auto-list`, NOT `/pass-yamap` (fixed via `router.replace`).
- [ ] Map screen title wraps to 2 lines on narrow Android viewports (`numberOfLines={2}` in ScreenHeader).
- [ ] "Ранее введён" header appears BEFORE its items, not after (suggestion list rendering order fix).
- [ ] Manual-zone banner triggers for user-history picks, not only map picks (detectedLocationType semantics).
- [ ] PIN error modal has no Cancel button (hideCancel on ConfirmModal).
- [ ] AutoFineScreen: status cards use PNG icons (twemoji_star_2, whh_sale_2), not ✔/🏷 emoji.
- [ ] CSP whitelist on `/pass-yamap` covers Yandex Maps v3 (`api-maps.yandex.ru`, `*.api-maps.yandex.ru`, `yastatic.net` in `script-src` / `style-src` / `worker-src`) — see ADR-011.

## Kazna payment integration — deep QA (added 2026-04-29)

This section is platform-aware and complements §F3 above. F3 covers the UI; this section covers the **end-to-end Kazna sandbox round-trip** across web + mobile DEV builds.

### Pre-flight setup

**Required for all platforms before starting:**

- [ ] `cd payment-service && docker compose ps` — both `payment-service` and `payment-db` containers are `Up`. If not: `docker compose up -d`.
- [ ] Local sanity probe: `curl -sf http://localhost:8001/health` returns `{"status":"ok"}` and `curl -X POST -H 'Content-Type: application/json' -d '{"amount":500}' http://localhost:8001/api/calculate-commission` returns valid JSON.
- [ ] If switching back from production-mode app: clear app storage on device (`npm run android:clear` / `npm run ios:clear`) so cached prod-URL config doesn't survive.

**What URL each platform actually hits (for debugability when something fails):**

| Platform | DEV-mode payment-API URL | Source |
|---|---|---|
| Web (browser at `https://transapp-dev.ru`) | `https://transapp-dev.ru/payment-api/<endpoint>` | `src/services/api.web.ts:23` |
| Web (browser at `localhost`) | `http://localhost:8001/api/<endpoint>` | `src/services/api.web.ts:21` |
| iOS Simulator (DEV) | `http://localhost:8001/api/<endpoint>` | `src/services/api.ts:14` |
| Android Emulator (DEV) | `http://10.0.2.2:8001/api/<endpoint>` (alias for host's 8001) | `src/services/api.ts:13` |
| Android physical device (DEV) | `http://10.0.2.2:8001/api` from current code — **will fail** on physical hardware. Workaround: `adb reverse tcp:8001 tcp:8001` + temporarily edit `api.ts:13` to `http://localhost:8001/api`, OR use Mac's LAN IP. |  |
| iOS physical device (DEV) | same — `localhost` won't reach the Mac. Use Mac's LAN IP via temporary edit. |  |
| Mobile prod-build | `https://payment.transapp.ru/api` — **does not resolve in DNS**. Mobile prod is currently broken pending Phase 2 cohabitation; do NOT QA against a release-mode mobile build today. | `src/services/api.ts:18` |

### F7. Single-charge Kazna payment flow (happy path)

Run on **each** of: Web (transapp-dev.ru), iOS Simulator, Android Emulator.

- [ ] Login → AutoList → tap on a vehicle.
- [ ] Charges tab shows at least one ГИБДД fine. (If no real fines available — kazna sandbox auto-injects test UIN `18810177170712879661` per `payment.py:248-250`.)
- [ ] Tap one charge → bottom footer shows "Оплатить" with sum + count = 1.
- [ ] Tap "Оплатить" → PaymentConfirmScreen.
- [ ] Verify commission breakdown:
    - kazna_commission ≈ 2% of amount, min 15₽
    - transapp_commission ≈ 0.1% of amount, min 0.01₽
    - total = amount + commissions
- [ ] FIO field validation: empty/Latin/4+ words → submit blocked with error.
- [ ] Receipt switch toggles `kvit: true/false` in `init-payment` request body.
- [ ] Tap "Оплатить" → WebView opens (mobile) / iframe shown (web) with `demopay.oplatagosuslug.ru` URL.
- [ ] Kazna sandbox UI loads. Use test card from Kazna PDF section 6.x ("Эмуляция оплаты").
- [ ] Successful payment → redirect to `transapp.ru/payment/success` (configured `returnSuccessUrl` in `kazna.py:94`).
- [ ] FinePaymentSuccessScreen renders with checkmark + amount.
- [ ] Polling kicks in: `GET /payment-status/{paymentID}` is called every N seconds (Network tab on web; `console.log` on mobile via Metro).
- [ ] After 1-2 polls, status flips from `pending` → `auth` (Kazna's "успешно оплачен" status).
- [ ] DB confirms: `docker compose exec payment-db psql -U postgres -d payment_db -c "SELECT id, kazna_status, kazna_payment_id FROM payment_transactions ORDER BY created_at DESC LIMIT 1;"` shows `auth`.
- [ ] Per-UIN status: `... SELECT uin, status, paid_at FROM payment_transaction_items WHERE transaction_id = '<id>'` shows `paid` for the UIN, with `paid_at` set.
- [ ] Navigate back to AutoList → the paid charge no longer appears in active charges (or is marked paid).

### F8. Multi-charge Kazna payment flow

Run on **each** platform.

- [ ] Select 2+ charges of the same depType (e.g. two ГИБДД fines) → footer shows summed total.
- [ ] Tap "Оплатить" → PaymentConfirmScreen → commission breakdown shows **details** array (per-type rows), not just totals.
- [ ] After WebView/iframe success → DB row in `payment_transaction_items` exists for **each** UIN, all with `status = paid`.
- [ ] Select 2+ charges of **mixed** depTypes (e.g. ГИБДД + ПЛАТОН) → commission rates differ per type; UI shows separate rows.
- [ ] Mixed-type payment may be rejected by Kazna sandbox or split into separate transactions — document the actual behaviour observed on each platform.

### F9. Kazna payment failure / cancel paths

Run on **each** platform.

- [ ] Inside Kazna WebView, click "Cancel" / close → redirect to `transapp.ru/payment/fail`.
- [ ] App returns to PaymentConfirm or AutoList without "оплачено" markers.
- [ ] Polling shows status remains `pending` for several minutes, eventually transitions to `cancel` (Kazna eventually times out the order).
- [ ] DB row: `kazna_status = pending` initially, then `cancel` after Kazna reconciles.
- [ ] User-friendly error path: invalid FIO format triggered server-side returns "Пожалуйста, укажите Фамилию, Имя и Отчество..." (see `ERROR_MESSAGES` in `payment.py:18-24`).
- [ ] Closing WebView in the middle of payment (back-button / swipe / browser tab close): polling continues — eventually one of `auth` / `cancel` / `error` lands and UI reflects.

### F10. Backend deep checks (independent of UI)

Not user-facing, but worth running once after the visual QA pass to catch silent backend regressions.

- [ ] `https://transapp-dev.ru/health` → 200 + `ok` (added 2026-04-29).
- [ ] `https://transapp-dev.ru/payment-api/schema` → HTML index of available API docs.
- [ ] `https://transapp-dev.ru/payment-api/schema/swagger` → Swagger UI loads, lists 9 endpoints.
- [ ] `https://transapp-dev.ru/payment-api/schema/openapi.json` → valid OpenAPI 3.1.0 JSON.
- [ ] `https://transapp-dev.ru/payment-api/calculate-commission` smoke (POST `{"amount":500}`) returns valid JSON with `kazna_commission`, `transapp_commission`, `total_amount`.
- [ ] Regression: `https://transapp-dev.ru/payment-api/api/calculate-commission` (old double `/api`) returns **404** (this is checked in CI on every deploy via `deploy-web.yml` smoke job, but a manual confirmation doesn't hurt).
- [ ] payment-service container HEALTHCHECK is `healthy`: `docker compose ps` shows STATUS column without `(unhealthy)` markers.

### F11. Real-device caveats (when running on physical iPhone / Android)

- [ ] iOS physical device: requires Apple Developer signing — likely already provisioned via Xcode for your Apple ID. Use `expo run:ios --device`.
- [ ] Android physical device: USB debugging enabled, `adb devices` shows the device, `npm run android:device` (already includes `adb reverse tcp:8081 tcp:8081` + `tcp:8097 tcp:8097` for Metro).
- [ ] Both: payment-service on host:8001 is **not** automatically reachable from the device. Options:
    - **Option A (cleanest):** add `adb reverse tcp:8001 tcp:8001` after `setup:device` step, then payment-API URL `http://localhost:8001/api` works on the device.
    - **Option B:** use Mac's LAN IP (e.g. `192.168.1.42`) and temporarily edit `src/services/api.ts:13-15` to that IP. Don't commit.
- [ ] Cleartext HTTP: in DEV-mode Expo enables `usesCleartextTraffic` in AndroidManifest automatically. iOS DEV: NSAllowsArbitraryLoads also handled by Expo's plugins. If a request fails with `cleartext communication not permitted` — that means the app was launched in release mode, not DEV.

### Sandbox vs production indicators

When QA-ing, you should see these markers indicating you're hitting **sandbox**, not production:

- [ ] Kazna URL in WebView starts with `demopay.oplatagosuslug.ru` (NOT `pay.oplatagosuslug.ru`).
- [ ] In `init-payment` server logs (`docker compose logs payment-service`), the `KAZNA_API_URL` setting is `https://demopay.oplatagosuslug.ru/api/kazna/2.2`.
- [ ] When `init-payment` is called with a real-looking UIN, the test-mode hack at `payment.py:248-250` replaces it with the canonical sandbox UIN `18810177170712879661` and logs `TEST MODE: Replacing real UIN ... with test UIN ...` in the warning log.
- [ ] No real money is moved (sandbox is risk-free).

### Findings log

Use this table to record what works / what doesn't on each platform:

| Flow | Web | iOS Sim | Android Emu | Notes |
|------|-----|---------|-------------|-------|
| F7 (single charge happy path) | | | | |
| F8 (multi-charge) | | | | |
| F9 (cancel / fail) | | | | |
| F10 (backend smokes) | n/a | n/a | n/a | One-time |
| F11 (real device) | n/a | | | If applicable |

## Sign-off

Tester initials + date after all boxes ticked:

| Platform | Tester | Date |
|---|---|---|
| iOS | | |
| Android | | |
| Chrome desktop 1920 | | |
| Chrome desktop 1280 | | |
| Chrome mobile 375 | | |

Accessibility audit sign-off (separate role if available):

| Audit | Tester | Date |
|---|---|---|
| VoiceOver on iOS / Safari | | |
| NVDA on Windows / Firefox | | |
| axe-core / Lighthouse scan | | |
