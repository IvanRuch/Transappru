import React, { useRef } from 'react';
import { View, Text, TextInput, Image, Platform } from 'react-native';
import { useSafariAutofillFix } from '../../hooks/useSafariAutofillFix';

// On web, stretch the underlying <input> to fill its visual container.
// Without this, Safari draws its focus ring / autofill overlay around the
// real (content-sized) input which sits in the middle of the tall 75px
// card — so the user's click target and the visible rectangle diverge.
const BASE_INPUT_STYLE = Platform.select<object>({
  web: { padding: 0, width: '100%', height: '100%' },
  default: {},
})!;
// Region leaves 20px at the bottom for the RUS/flag caption, so it uses
// a fixed 45px height on both platforms (web just adds full-width + reset padding).
const REGION_INPUT_STYLE = Platform.select<object>({
  web: { padding: 0, width: '100%', height: 45 },
  default: { height: 45 },
})!;

interface PlateInputProps {
  /** Base characters (letter-digit-digit-digit-letter-letter). */
  base: string;
  onChangeBase: (value: string) => void;
  /** Region code (2 or 3 digits). */
  region: string;
  onChangeRegion: (value: string) => void;
  /** Optional label above the plate. */
  label?: string;
}

/**
 * Russian license plate input — base part on the left, region + RUS/flag
 * on the right, visually matching the actual vehicle plate. The input
 * normalization (Latin→Cyrillic, uppercase, allowed chars, digit-only region)
 * is expected to be done by the caller via its hook (e.g. useInnBinding uses
 * `normalizePlate` from utils/plateHelpers).
 *
 * On web, `useSafariAutofillFix` hides Safari's autofill overlay and strips
 * RN-generated attributes that trigger it — otherwise Safari injects the
 * Contacts autofill button on top of the plate input, breaking the layout.
 */
export default function PlateInput({
  base, onChangeBase, region, onChangeRegion, label,
}: PlateInputProps) {
  const baseRef = useRef<any>(null);
  const regionRef = useRef<any>(null);
  useSafariAutofillFix([baseRef, regionRef]);

  return (
    <View className="bg-[#F7F7F7] rounded-3xl mt-4 p-3.5 border border-border-primary">
      {label ? (
        <Text className="text-[13px] text-text-primary text-center select-none mb-3">{label}</Text>
      ) : null}

      <View className="items-center">
        <View className="flex-row" style={{ width: 255, height: 75 }}>
          {/* Base */}
          <View
            className="bg-white border border-border-primary items-center justify-center rounded-l-lg"
            style={{ flex: 188, height: 75 }}
          >
            <TextInput
              ref={baseRef}
              className="text-[29px] text-center text-text-primary"
              style={BASE_INPUT_STYLE}
              maxLength={6}
              placeholder="А000АА"
              placeholderTextColor="#B8B8B8"
              autoCapitalize="characters"
              onChangeText={onChangeBase}
              value={base}
            />
          </View>
          {/* Divider */}
          <View className="bg-border-primary" style={{ flex: 1, height: 75 }} />
          {/* Region + RUS/flag */}
          <View
            className="bg-white border border-border-primary items-center rounded-r-lg"
            style={{ flex: 114, height: 75 }}
          >
            <TextInput
              ref={regionRef}
              keyboardType="numeric"
              inputMode="numeric"
              className="text-[29px] text-center text-text-primary"
              style={REGION_INPUT_STYLE}
              maxLength={3}
              placeholder="777"
              placeholderTextColor="#B8B8B8"
              onChangeText={onChangeRegion}
              value={region}
            />
            <View className="flex-row items-center justify-center" style={{ height: 20 }}>
              <Text className="pr-1 text-sm text-text-primary">RUS</Text>
              <Image
                source={require('../../../assets/images/flag_rus.png')}
                style={{ width: 24, height: 12 }}
                accessibilityIgnoresInvertColors
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
