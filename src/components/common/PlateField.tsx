import React, { useRef } from 'react';
import { View, Text, TextInput, Image, Platform, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafariAutofillFix } from '../../hooks/useSafariAutofillFix';

interface PlateFieldProps {
  base: string;
  region: string;
  onChangeBase: (value: string) => void;
  onChangeRegion: (value: string) => void;
  /** Optional caption rendered above the plate (left-aligned). */
  label?: string;
  /** Optional style override for the outer card (e.g. centering, margins). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Russian license plate input — base characters on the left, region +
 * "RUS" caption on the right, wrapped in a soft-gray rounded card that
 * matches the look of the AddAutoModal plate block.
 *
 * Used by:
 *   - `AddAutoModal` (add a new vehicle)
 *   - `InnScreen` / `InnScreen.web` (RNIS vehicle check, registration flow)
 *
 * Web polish:
 *   - `useSafariAutofillFix` hides Safari's `::-webkit-contacts-auto-fill-button`
 *     and strips RN-generated attributes so Safari no longer offers autofill.
 *   - `Platform.select` stretches the underlying `<input>` to fill its visual
 *     container so the focus ring and click target match the plate outline.
 *
 * Input normalisation (Latin→Cyrillic, digit-only region, clamping) is
 * expected to happen in the caller's hook (e.g. `useAutoActions`,
 * `useInnBinding`). This component is presentation-only.
 */
export default function PlateField({
  base, region, onChangeBase, onChangeRegion, label, style,
}: PlateFieldProps) {
  const baseRef = useRef<any>(null);
  const regionRef = useRef<any>(null);
  useSafariAutofillFix([baseRef, regionRef]);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.plateOuter}>
        <View style={styles.plateRow}>
          {/* Base characters */}
          <View style={styles.base}>
            <TextInput
              ref={baseRef}
              style={styles.baseInput}
              maxLength={6}
              placeholder="А000АА"
              placeholderTextColor="#B8B8B8"
              autoCapitalize="characters"
              onChangeText={onChangeBase}
              value={base}
            />
          </View>

          {/* Vertical divider */}
          <View style={styles.separator} />

          {/* Region + RUS caption */}
          <View style={styles.region}>
            <TextInput
              ref={regionRef}
              keyboardType="numeric"
              inputMode="numeric"
              style={styles.regionInput}
              maxLength={3}
              placeholder="777"
              placeholderTextColor="#B8B8B8"
              onChangeText={onChangeRegion}
              value={region}
            />
            <View style={styles.regionBottom}>
              <Text style={styles.regionText}>RUS</Text>
              <Image
                source={require('../../../assets/images/flag_rus.png')}
                style={styles.regionFlag}
                accessibilityIgnoresInvertColors
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F7F7',
    borderRadius: 25,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  label: {
    fontSize: 12,
    color: '#313131',
  },
  plateOuter: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 20,
  },
  plateRow: {
    flexDirection: 'row',
    width: 305,
    height: 80,
  },
  base: {
    flex: 188,
    backgroundColor: '#FFFFFF',
    height: 80,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  baseInput: {
    fontSize: 34,
    textAlign: 'center',
    color: '#313131',
    ...Platform.select({
      web: { padding: 0, width: '100%', height: '100%' },
      default: { paddingTop: 5 },
    }),
  },
  separator: {
    flex: 1,
    backgroundColor: '#B8B8B8',
    height: 80,
  },
  region: {
    flex: 114,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    height: 80,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  regionInput: {
    height: 55,
    fontSize: 34,
    textAlign: 'center',
    color: '#313131',
    ...Platform.select({
      web: { padding: 0, width: '100%' },
      default: { paddingBottom: -10 },
    }),
  },
  regionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 25,
  },
  regionText: {
    paddingRight: 5,
    fontSize: 16,
    color: '#2c2c2c',
  },
  regionFlag: {
    width: 24,
    height: 12,
  },
});
