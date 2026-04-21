/**
 * Ambient type shims for modules without bundled declarations.
 *
 * react-dom:
 *   - The project uses react-dom@19, which does not ship its own .d.ts files.
 *   - We load it dynamically (`await import('react-dom')`) only on web to
 *     pass as a dependency to @yandex/ymaps3-reactify. We don't use any
 *     specific DOM React APIs directly, so `any` is sufficient.
 *   - Installing `@types/react-dom` is the "proper" fix; this shim keeps
 *     typechecking green without adding a dev dependency.
 */
declare module 'react-dom';
