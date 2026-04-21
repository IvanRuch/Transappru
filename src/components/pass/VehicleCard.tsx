import React from 'react';
import { View, Text, Image } from 'react-native';

export interface VehicleCardData {
  id: number | string;
  auto_number_base?: string;
  auto_number_region_code?: string;
  check_passes_string?: string;
}

interface VehicleCardProps {
  vehicle: VehicleCardData;
}

/**
 * Compact vehicle summary card. Shows truck icon, plate number and pass status.
 */
export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const plate = `${vehicle.auto_number_base ?? ''}${vehicle.auto_number_region_code ?? ''}`;
  return (
    <View
      className="flex-row p-3 mx-5 mb-2 rounded-lg border items-center bg-bg-secondary border-border-primary"
      accessibilityRole="text"
      accessibilityLabel={`${plate}. Пропуск ${vehicle.check_passes_string ?? ''}`}
    >
      <View className="items-center justify-center mr-3">
        <Image
          source={require('../../../assets/images/truck.png')}
          style={{ width: 47, height: 36 }}
        />
        <Text className="mt-1 text-sm font-bold text-text-primary">{plate}</Text>
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-sm text-text-primary">Пропуск — {vehicle.check_passes_string ?? ''}</Text>
      </View>
    </View>
  );
}
