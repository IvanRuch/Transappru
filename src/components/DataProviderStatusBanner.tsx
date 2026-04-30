import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDataProviderHealth } from '../hooks/useDataProviderHealth';
import { PROVIDER_LABELS, type ProviderId } from '../utils/providerHealth';

/**
 * Top-sticky amber banner that shows up when one or more upstream
 * data providers (fines / OSAGO / passes / diagnostic-card / RNIS /
 * tolled roads) are degraded or down. Detection is purely frontend
 * for now (rolling failure-rate over a 60s window — see
 * `src/utils/providerHealth.ts`). Backend-driven `system_notice`
 * support is planned as Phase 2 in
 * `.claude/plans/2026-04-30-data-provider-health.md`.
 *
 * UX intentions:
 *   - never blocks content — only takes top strip
 *   - amber, not red, so users can distinguish from
 *     `NetworkStatusBanner`'s red "no internet" state
 *   - dismissible per session via ✕; reopens automatically when a
 *     fresh provider transitions to degraded/down AFTER dismiss
 *   - auto-hides when all providers recover (no manual close needed)
 *
 * Why a session-scoped (not persistent) dismiss: provider outages
 * usually clear within hours; persistent dismiss would risk hiding a
 * different outage tomorrow that the user needs to know about.
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
 * Stable key for the current set of problematic providers — used as
 * the dismiss signature. When the set changes (a new provider goes
 * degraded/down), the signature changes, dismiss flag stops matching,
 * banner re-appears.
 */
function buildSignature(degraded: ProviderId[], down: ProviderId[]): string {
  const ids = [...degraded, ...down].sort();
  return ids.join(',');
}

function describeProviders(degraded: ProviderId[], down: ProviderId[]): string {
  // Down first (more severe), then degraded. De-dupe in case future logic
  // pushes a provider into both arrays.
  const seen = new Set<ProviderId>();
  const ordered: ProviderId[] = [];
  [...down, ...degraded].forEach(p => {
    if (!seen.has(p)) { seen.add(p); ordered.push(p); }
  });
  return ordered.map(p => PROVIDER_LABELS[p]).join(', ');
}

export default function DataProviderStatusBanner() {
  const { degraded, down, hasIssues } = useDataProviderHealth();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const [visible, setVisible] = useState(false);

  const signature = buildSignature(degraded, down);
  const dismissedSignature = readDismissed();
  const shouldShow = hasIssues && dismissedSignature !== signature;

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
        <Text style={styles.text} numberOfLines={2}>
          Временные перебои: {describeProviders(degraded, down)}
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
