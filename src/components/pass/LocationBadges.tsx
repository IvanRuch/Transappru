import React from 'react';
import { View, Text } from 'react-native';

export interface LocationTypes {
  mkad?: 0 | 1;
  ttk?:  0 | 1;
  sk?:   0 | 1;
}

interface LocationBadgesProps {
  types?: LocationTypes | null;
}

/**
 * Vertical stack of three zone badges (МКАД/ТТК/СК). Each badge is colored
 * when its zone is included for this address, and grey otherwise.
 * Zone colors come from `tailwind.config.js` → `colors.zone.{mkad,ttk,sk,inactive}`.
 */
export default function LocationBadges({ types }: LocationBadgesProps) {
  const t = types || {};
  return (
    <View className="w-10">
      <View className={`items-center m-px rounded-sm py-px ${t.mkad === 1 ? 'bg-zone-mkad' : 'bg-zone-inactive'}`}>
        <Text className="text-[10px] font-bold text-white">МКАД</Text>
      </View>
      <View className={`items-center m-px rounded-sm py-px ${t.ttk === 1 ? 'bg-zone-ttk' : 'bg-zone-inactive'}`}>
        <Text className="text-[10px] font-bold text-white">ТТК</Text>
      </View>
      <View className={`items-center m-px rounded-sm py-px ${t.sk === 1 ? 'bg-zone-sk' : 'bg-zone-inactive'}`}>
        <Text className="text-[10px] font-bold text-white">СК</Text>
      </View>
    </View>
  );
}
