import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

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
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${plate}. Пропуск ${vehicle.check_passes_string ?? ''}`}
    >
      <View style={styles.left}>
        <Image source={require('../../../assets/images/truck.png')} style={styles.icon} />
        <Text style={styles.plate}>{plate}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.pass}>Пропуск — {vehicle.check_passes_string ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    alignItems: 'center',
  },
  left:  { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon:  { width: 47, height: 36 },
  plate: { marginTop: 4, fontSize: 14, fontWeight: '700', color: '#313131' },
  right: { flex: 1, justifyContent: 'center' },
  pass:  { fontSize: 14, color: '#313131' },
});
