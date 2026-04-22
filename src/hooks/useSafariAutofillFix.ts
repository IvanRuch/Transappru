import { useEffect, type MutableRefObject } from 'react';
import { Platform } from 'react-native';

/**
 * Attributes that React Native's `TextInput` serialises onto the underlying
 * `<input>` on web, and which Safari uses as heuristic signals to offer its
 * Contacts / Credentials autofill overlay. Stripping them makes the input
 * match the minimal attribute signature of a plain search field, so Safari
 * stops injecting the autofill button on top of it.
 */
const STRIP_ATTRS = [
  'autocomplete',
  'autocorrect',
  'autocapitalize',
  'spellcheck',
  'rows',
  'virtualkeyboardpolicy',
  'inputmode',
] as const;

// Ref-counted global style — ensures concurrent consumers (e.g. AddAutoModal
// open while a PlateField is also mounted on the INN screen) don't race and
// remove each other's <style> element on cleanup.
let installedCount = 0;
let styleEl: HTMLStyleElement | null = null;

function installGlobalStyle(): void {
  installedCount++;
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.id = 'ta-safari-autofill-fix';
  styleEl.textContent = `
    input::-webkit-contacts-auto-fill-button,
    input::-webkit-credentials-auto-fill-button {
      visibility: hidden !important;
      display: none !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      margin: 0 !important;
    }
  `;
  document.head.appendChild(styleEl);
}

function uninstallGlobalStyle(): void {
  installedCount = Math.max(0, installedCount - 1);
  if (installedCount === 0 && styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
  }
}

function stripRnAttrs(ref: MutableRefObject<any>): void {
  const node = ref.current;
  if (!node) return;
  // RN-Web may hand us either the raw <input> or a wrapper — handle both.
  const input =
    node.tagName === 'INPUT'
      ? node
      : typeof node.querySelector === 'function'
        ? node.querySelector('input')
        : null;
  if (!input) return;
  for (const attr of STRIP_ATTRS) input.removeAttribute(attr);
}

/**
 * Web-only polish for RN `TextInput` elements that render as `<input>` on web.
 *
 * - Installs a global CSS rule that hides Safari's autofill overlays
 *   (`::-webkit-contacts-auto-fill-button`, `::-webkit-credentials-auto-fill-button`).
 *   The rule is ref-counted so multiple consumers can mount simultaneously
 *   without tearing each other's style down.
 * - Strips the autofill-triggering attributes RN adds by default from the
 *   given refs, so Safari no longer offers autofill on top of the input.
 *
 * No-op on native platforms.
 *
 * @param refs Array of refs to `TextInput`-like components.
 * @param when Apply only while `true` — useful when the owner is modal-gated.
 */
export function useSafariAutofillFix(
  refs: Array<MutableRefObject<any>>,
  when: boolean = true,
): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || !when) return;

    installGlobalStyle();
    // Strip on the next frame — RN needs to flush props onto the real DOM node first.
    const timer = setTimeout(() => {
      refs.forEach(stripRnAttrs);
    }, 50);

    return () => {
      clearTimeout(timer);
      uninstallGlobalStyle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when]);
}
