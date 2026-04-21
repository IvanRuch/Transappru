import React from 'react';
import { View, Text } from 'react-native';
import { UserData } from '../../types/user';

interface UserProfileInfoProps {
  user: UserData | null;
}

/**
 * Read-only organization info block: firm name and INN.
 * Both screens render the same two fields; this component unifies the look.
 */
export default function UserProfileInfo({ user }: UserProfileInfoProps) {
  return (
    <View className="bg-white rounded-xl p-5 mb-4">
      <Text className="text-[17px] font-bold text-text-primary mb-3 select-none">Организация</Text>

      <View className="flex-row py-2 border-b border-[#F0F0F0]">
        <Text className="w-[100px] text-sm text-text-muted select-none">Название:</Text>
        <Text className="flex-1 text-[15px] text-text-primary">{user?.firm || '—'}</Text>
      </View>

      <View className="flex-row py-2">
        <Text className="w-[100px] text-sm text-text-muted select-none">ИНН:</Text>
        <Text className="flex-1 text-[15px] text-text-primary">{user?.inn || '—'}</Text>
      </View>
    </View>
  );
}
