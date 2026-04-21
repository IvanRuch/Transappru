import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  findNodeHandle,
} from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  /** Label for the dismiss button. Default: 'ОК'. */
  dismissLabel?: string;
}

/**
 * Cross-platform success modal.
 *
 * Mobile: uses RN `Modal` — Android back button invokes `onRequestClose`.
 * Web: same `Modal` rendered by react-native-web, plus:
 *   - Escape key closes
 *   - Click on the dim overlay closes
 *   - Focus is trapped on the dismiss button when opened; focus returns to
 *     previously focused element on close
 */
export default function SuccessModal({
  visible,
  message,
  onClose,
  dismissLabel = 'ОК',
}: SuccessModalProps) {
  const buttonRef = useRef<any>(null);
  const prevFocusRef = useRef<Element | null>(null);

  // Web-only: Escape handler + focus management.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!visible) return;

    prevFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;

    const focusButton = () => {
      const node = buttonRef.current;
      if (!node) return;
      // react-native-web returns a DOM node via findNodeHandle
      const dom = (node.focus ? node : findNodeHandle(node)) as HTMLElement | null;
      if (dom && typeof (dom as HTMLElement).focus === 'function') {
        (dom as HTMLElement).focus();
      }
    };
    const timer = setTimeout(focusButton, 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        // Trap focus on the single button
        e.preventDefault();
        focusButton();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      const prev = prevFocusRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Закрыть окно"
      >
        <Pressable
          // Stop propagation so clicks on the dialog don't close via overlay.
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          style={styles.dialog}
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Успешно"
        >
          <Text style={styles.message}>{message}</Text>
          <Pressable
            ref={buttonRef}
            onPress={onClose}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
          >
            <Text style={styles.buttonText}>{dismissLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)' as any,
      },
    }),
  },
  message: {
    fontSize: 16,
    color: '#313131',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' as any },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
