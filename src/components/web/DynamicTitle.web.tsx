// Sets the browser tab <title> per route through expo-router/head, which
// feeds the value into the same react-helmet-async <title data-rh="true">
// that Expo Router injects first in <head>. Without this, the helmet tag
// stays empty and browsers fall back to displaying the URL in the tab.
//
// Lookup-table approach: cheaper than spreading <Head> across 30 screen
// files, and gives one obvious place to edit when adding a route or
// renaming a section.

import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

const SUFFIX = ' — TransApp';
const DEFAULT_TITLE = 'TransApp — управление автопарком и штрафами';

// Static path → title (no suffix applied; full title written explicitly)
const STATIC_TITLES: Record<string, string> = {
  '/': DEFAULT_TITLE,
  '/pin': `Вход${SUFFIX}`,
  '/onboarding': `Знакомство${SUFFIX}`,
  '/user': `Профиль${SUFFIX}`,
  '/invite-user': `Пригласить${SUFFIX}`,
  '/deleted': `Аккаунт удалён${SUFFIX}`,
  '/auto-list': `Автопарк${SUFFIX}`,
  '/main': `Главная${SUFFIX}`,
  '/charges': `Штрафы${SUFFIX}`,
  '/drivers': `Водители${SUFFIX}`,
  '/services': `Услуги${SUFFIX}`,
  '/notifications': `Уведомления${SUFFIX}`,
  '/notification-settings': `Настройки уведомлений${SUFFIX}`,
  '/pass': `Пропуска${SUFFIX}`,
  '/pass-yamap': `Карта пропусков${SUFFIX}`,
  '/inn': `Привязка ИНН${SUFFIX}`,
  '/auto-fine': `Штраф${SUFFIX}`,
  '/auto-driver': `Водитель авто${SUFFIX}`,
  '/del-user': `Удаление аккаунта${SUFFIX}`,
  '/fine-payment-select': `Оплата штрафа${SUFFIX}`,
  '/fine-payment-confirm': `Подтверждение оплаты${SUFFIX}`,
  '/fine-payment-success': `Оплата выполнена${SUFFIX}`,
  '/fine-payment-webview': `Оплата${SUFFIX}`,
};

// Dynamic patterns — order-sensitive: first match wins.
const DYNAMIC_TITLES: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => /^\/auto\/[^/]+$/.test(p), title: `Авто${SUFFIX}` },
];

function resolveTitle(pathname: string): string {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  for (const entry of DYNAMIC_TITLES) {
    if (entry.test(pathname)) return entry.title;
  }
  return DEFAULT_TITLE;
}

export function DynamicTitle() {
  const pathname = usePathname();
  return (
    <Head>
      <title>{resolveTitle(pathname)}</title>
    </Head>
  );
}
