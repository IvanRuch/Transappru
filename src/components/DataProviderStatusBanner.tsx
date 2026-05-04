import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROVIDER_LABELS, type ProviderId } from '../constants/providerLabels';
import { useSystemNotice } from '../hooks/useSystemNotice';

/**
 * Top-sticky amber banner shown when the backend has at least one
 * active `system_notice` for any of the six data categories (fines /
 * OSAGO / passes / diagnostic-card / RNIS / tolled roads).
 *
 * The source of truth lives server-side now (ADR-012, PR-1):
 *   - admin activates / deactivates banners via Telegram bot
 *     `@transappmonitor_bot`,
 *   - or the auto-banner threshold (≥3 distinct user complaints / 6h)
 *     creates one,
 *   - the frontend polls `GET /payment-api/system-notice` every 60s
 *     via `useSystemNotice`.
 *
 * UX intentions (unchanged from Phase 1):
 *   - never blocks content — only takes a top strip,
 *   - amber, not red, to distinguish from `NetworkStatusBanner`'s
 *     red "no internet" state (one tick lower zIndex too),
 *   - dismissible per session via ✕; reopens automatically when the
 *     active set of categories changes (different incident),
 *   - auto-hides when the backend marks all notices deactivated.
 */

// Web: sessionStorage. Native: module-level (resets on cold start).
const DISMISS_KEY = 'ta_provider_status_dismissed_v1';
let _nativeDismissedSignature: string | null = null;

function readDismissed(): string | null {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; }
  }
  return _nativeDismissedSignature;
}
function writeDismissed(signature: string): void {
  if (Platform.OS === 'web') {
    try { sessionStorage.setItem(DISMISS_KEY, signature); } catch { /* ignore */ }
  } else {
    _nativeDismissedSignature = signature;
  }
}

/**
 * Stable key for the current set of active categories — used as the
 * dismiss signature. When the set changes (a new incident, even on
 * a different category), the signature changes, dismiss flag stops
 * matching, banner re-appears.
 */
function buildSignature(categories: ProviderId[]): string {
  return [...categories].sort().join(',');
}

/**
 * Default fallback text when no admin-provided message is available.
 * Single-notice incidents use the notice's own `message` field; this
 * is reserved for the rare case of multiple simultaneously active
 * notices when joining individual messages would be too long.
 */
function describeCategories(categories: ProviderId[]): string {
  const seen = new Set<ProviderId>();
  const ordered: ProviderId[] = [];
  categories.forEach(p => {
    if (!seen.has(p)) { seen.add(p); ordered.push(p); }
  });
  return ordered.map(p => PROVIDER_LABELS[p]).join(', ');
}

export default function DataProviderStatusBanner() {
  const { notices, categories, hasIssues } = useSystemNotice();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const [visible, setVisible] = useState(false);

  const signature = buildSignature(categories);
  const dismissedSignature = readDismissed();
  const shouldShow = hasIssues && dismissedSignature !== signature;

  // Single notice → use the admin-supplied message verbatim.
  // Multiple notices → fall back to the comma-joined label list.
  const text = notices.length === 1
    ? notices[0].message
    : `Возможны временные перебои: ${describeCategories(categories)}`;

  useEffect(() => {
    if (shouldShow && !visible) {
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else if (!shouldShow && visible) {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setVisible(false));
    }
  }, [shouldShow, visible, translateY]);

  const handleDismiss = useCallback(() => {
    writeDismissed(signature);
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setVisible(false));
  }, [signature, translateY]);

  if (!visible && !shouldShow) return null;

  // Native: sit below the status bar / notch.
  // Web: simple top-of-viewport (NetworkStatusBanner shares this slot;
  // when both fire — rare — they'll overlap by zIndex; offline is
  // strictly more severe so we keep our zIndex one tick lower).
  const safePaddingTop = Platform.OS === 'web'
    ? 8
    : Math.max(insets.top, StatusBar.currentHeight || 0) + 8;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }], paddingTop: safePaddingTop },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Text style={styles.text} numberOfLines={3}>
          {text}
        </Text>
        <Pressable
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Скрыть уведомление"
          hitSlop={8}
          style={styles.dismissButton}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // One tick below NetworkStatusBanner (zIndex 9999) — when both
    // fire, the offline banner stays on top because it's strictly
    // more severe (no internet → no provider data either).
    zIndex: 9998,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFC107',
    elevation: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  dismissText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
  },
});
