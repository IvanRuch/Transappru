import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

type MapOverlayVariant = 'loading' | 'address' | 'warning';

interface MapAddressOverlayProps {
  variant: MapOverlayVariant;
  /** Address text for `variant='address'`. */
  address?: string;
}

/**
 * Top-of-map overlay shown above the rendered map. Three states:
 *   - loading: "Определение адреса..." + spinner (while /get-address-map is in flight)
 *   - address: white card with the resolved address in large bold
 *   - warning: amber-text card with "Адрес вне выбранной зоны"
 *
 * Positioned absolutely under the ScreenHeader; parent is the map screen root.
 */
export default function MapAddressOverlay({ variant, address }: MapAddressOverlayProps) {
  if (variant === 'loading') {
    return (
      <View className="absolute top-[80px] left-0 right-0 items-center justify-center z-10">
        <View
          className="flex-row items-center mx-5 p-4 bg-white rounded-lg border border-border-primary web:shadow-lg"
          style={{ elevation: 5 }}
        >
          <ActivityIndicator size="small" color="#313131" />
          <Text className="ml-2.5 text-[15px] text-text-primary select-none">
            Определение адреса...
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'warning') {
    return (
      <View className="absolute top-[80px] left-0 right-0 z-10">
        <View className="mx-5 p-2.5 bg-white rounded-lg border border-border-primary items-center">
          <Text className="text-xl font-bold text-[#fee600] text-center select-none">
            Адрес находится вне выбранной зоны
          </Text>
        </View>
      </View>
    );
  }

  // variant === 'address'
  return (
    <View className="absolute top-[80px] left-0 right-0 z-10">
      <View className="mx-5 p-2.5 bg-white rounded-lg border border-border-primary">
        <Text className="text-xl font-bold text-text-primary pl-2.5 select-none">
          {address}
        </Text>
      </View>
    </View>
  );
}
