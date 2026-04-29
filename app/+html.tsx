// Custom root HTML template for Expo Web (Expo Router 6+).
// Rendered once at build time per route when `web.output = "static"`.
// Docs: https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* SEO — note: <title> is intentionally NOT here. Expo Router's
            internal react-helmet always injects an empty <title data-rh="true">
            as the first head element, and HTML5 spec says only the FIRST
            <title> wins. So we feed the title through expo-router/head
            (DynamicTitle component in app/_layout.tsx) — that path replaces
            the empty react-helmet title instead of duplicating it. */}
        <meta
          name="description"
          content="Сервис для перевозчиков: проверка штрафов ГИБДД и РНИС, оплата через систему «Казна», контроль автопарка."
        />
        <meta name="robots" content="index, follow" />

        {/* Theme + iOS PWA */}
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TransApp" />
        <meta name="format-detection" content="telephone=no" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:site_name" content="TransApp" />
        <meta
          property="og:title"
          content="TransApp — управление автопарком и штрафами"
        />
        <meta
          property="og:description"
          content="Сервис для перевозчиков: проверка штрафов ГИБДД и РНИС, оплата через «Казну», контроль автопарка."
        />
        <meta property="og:image" content="/icon-512.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TransApp" />
        <meta
          name="twitter:description"
          content="Управление автопарком и штрафами."
        />
        <meta name="twitter:image" content="/icon-512.png" />

        {/* Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
