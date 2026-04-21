import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
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
        className="flex-1 items-center justify-center p-5 bg-black/45"
        onPress={onClose}
        accessibilityLabel="Закрыть окно"
      >
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-white rounded-2xl py-6 px-6 w-full max-w-[420px] items-center web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Успешно"
        >
          <Text className="text-base text-text-primary text-center mb-5 leading-[22px]">{message}</Text>
          <Pressable
            ref={buttonRef}
            onPress={onClose}
            className="bg-accent-secondary rounded-lg px-10 py-3 cursor-pointer"
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
          >
            <Text className="text-base font-bold text-white">{dismissLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
