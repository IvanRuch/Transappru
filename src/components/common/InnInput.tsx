import React, { useRef } from 'react';
import { View, TextInput, Platform, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafariAutofillFix } from '../../hooks/useSafariAutofillFix';

interface InnInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Override the visible placeholder. Defaults to "ИНН организации (10 или 12 цифр)". */
  placeholder?: string;
  /** Autofocus on mount. Useful for modals / screens where INN is the primary action. */
  autoFocus?: boolean;
  /** Optional container override (margins, width, etc.). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Russian INN input — 10 or 12 digit organization tax ID.
 *
 * Presentational component; numeric-only filtering and clamping is expected
 * from the caller's hook (e.g. `useInnBinding.changeInn`). The component
 * itself enforces `maxLength={12}` as a hard upper bound.
 *
 * Web polish:
 *   - `useSafariAutofillFix` hides Safari's autofill overlay and strips
 *     RN-generated attrs so the browser stops offering credential autofill.
 *   - `Platform.select` stretches `<input>` to fill the visible card — no
 *     mismatch between focus-ring / click target and the rendered box.
 *
 * Used by:
 *   - `InnScreen` / `InnScreen.web` (register-new / add-account flows)
 *   - `AddAccountModal` (web sidebar quick action)
 */
export default function InnInput({
  value, onChangeText, placeholder, autoFocus, style,
}: InnInputProps) {
  const inputRef = useRef<any>(null);
  useSafariAutofillFix([inputRef]);

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        inputMode="numeric"
        maxLength={12}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'ИНН организации (10 или 12 цифр)'}
        placeholderTextColor="#B8B8B8"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  input: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 4,
    color: '#1A1A1A',
    ...Platform.select({
      web: { padding: 0, width: '100%', height: '100%' },
      default: { height: 56 },
    }),
  },
});
