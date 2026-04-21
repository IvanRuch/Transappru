import React from 'react';
import { View, Text, TextInput, Image } from 'react-native';

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
 */
export default function PlateInput({
  base, onChangeBase, region, onChangeRegion, label,
}: PlateInputProps) {
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
              className="text-[29px] text-center text-text-primary"
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
              keyboardType="numeric"
              inputMode="numeric"
              className="text-[29px] text-center text-text-primary"
              style={{ height: 45 }}
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
