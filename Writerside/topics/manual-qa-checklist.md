# Manual QA Checklist — Screen Migration (ADR-003 + ADR-005)

Last updated: 2026-04-22.

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
