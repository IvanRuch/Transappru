import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { DriverData } from '../../types/drivers';

interface DriverCardProps {
  driver: DriverData;
  onEdit: (driver: DriverData) => void;
  /** Custom label for the edit action. Defaults to 'Изменить'. */
  editLabel?: string;
}

/**
 * Compact driver summary card: full name, license number, issue date,
 * plus an "Edit" action aligned to the right. Cross-platform.
 */
export default function DriverCard({ driver, onEdit, editLabel = 'Изменить' }: DriverCardProps) {
  const fullName = `${driver.name_f} ${driver.name_i} ${driver.name_o}`.trim();
  return (
    <View
      className="flex-row p-3.5 mb-2.5 rounded-lg border bg-bg-secondary border-border-primary"
      accessibilityRole="text"
      accessibilityLabel={`Водитель ${fullName}. ВУ ${driver.vu}. Дата выдачи ${driver.vu_reg}.`}
    >
      <View className="flex-1">
        <Text className="text-base font-bold text-text-primary mb-1 select-none">
          {fullName}
        </Text>
        <Text className="text-sm text-text-secondary select-none">ВУ: {driver.vu}</Text>
        <Text className="text-sm text-text-secondary select-none">Дата выдачи: {driver.vu_reg}</Text>
      </View>
      <Pressable
        className="justify-center pl-3 cursor-pointer"
        onPress={() => onEdit(driver)}
        accessibilityRole="button"
        accessibilityLabel={`Изменить водителя ${fullName}`}
      >
        <Text className="text-sm text-text-primary underline select-none">{editLabel}</Text>
      </Pressable>
    </View>
  );
}
