import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ContactData } from '../../types/user';

interface ContactCardProps {
  contact: ContactData;
  onPress: (contact: ContactData) => void;
}

/**
 * Contact summary card. Shows only the fields that are actually filled,
 * and opens edit on tap.
 */
export default function ContactCard({ contact, onPress }: ContactCardProps) {
  return (
    <Pressable
      className="flex-row items-center p-3.5 mb-2 rounded-[10px] border bg-bg-secondary border-border-secondary cursor-pointer"
      onPress={() => onPress(contact)}
      accessibilityRole="button"
      accessibilityLabel={`Редактировать контакт ${contact.fio || contact.phone || contact.email}`}
    >
      <View className="flex-1">
        {contact.fio !== '' && (
          <Text className="text-sm text-text-primary mb-0.5 select-none">ФИО: {contact.fio}</Text>
        )}
        {contact.email !== '' && (
          <Text className="text-sm text-text-primary mb-0.5 select-none">E-mail: {contact.email}</Text>
        )}
        {contact.phone !== '' && (
          <Text className="text-sm text-text-primary mb-0.5 select-none">Телефон: +{contact.phone}</Text>
        )}
        {contact.position !== '' && (
          <Text className="text-sm text-text-primary mb-0.5 select-none">Должность: {contact.position}</Text>
        )}
      </View>
      <Text className="text-lg text-text-muted ml-2 select-none">✎</Text>
    </Pressable>
  );
}
