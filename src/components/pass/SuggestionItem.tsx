import React from 'react';
import { View, Text, Pressable } from 'react-native';
import LocationBadges, { LocationTypes } from './LocationBadges';

export type SuggestionVariant = 'street' | 'address' | 'user';

export interface SuggestionData {
  id: number | string;
  location_types?: LocationTypes;

  // Street variant fields (from /get-address mode=street)
  p2?: string;
  p3?: string;
  p4?: string;
  p5?: string;
  p6?: string;
  p7?: string;

  // Address variant fields (from /get-address mode=address)
  l_concat?: string;

  // User-address variant fields (from /get-user-address-list)
  mos_ru_street_p7?: string;
  mos_ru_address_l_concat?: string;
}

interface SuggestionItemProps {
  item: SuggestionData;
  variant: SuggestionVariant;
  onPress: () => void;
  /** Optional ID for ARIA aria-activedescendant coordination on web. */
  nativeID?: string;
  /** Visual highlight when this item is focused via keyboard. */
  focused?: boolean;
}

/**
 * Unified card for all three suggestion variants (street, address, previously
 * entered). Layout: location badges on the left, textual details on the right.
 */
export default function SuggestionItem({
  item,
  variant,
  onPress,
  nativeID,
  focused,
}: SuggestionItemProps) {
  return (
    <Pressable
      nativeID={nativeID}
      accessibilityRole="button"
      accessibilityLabel={buildAccessibilityLabel(item, variant)}
      className={`flex-row p-2.5 mx-5 mb-2 rounded-lg border cursor-pointer ${
        focused
          ? 'bg-[#E4E4E4] border-[#3A3A3A]'
          : 'bg-bg-secondary border-border-primary'
      }`}
      onPress={onPress}
    >
      <LocationBadges types={item.location_types} />
      <View className="flex-1 pl-2.5">
        {variant === 'street' && (
          <>
            {item.p2 ? <Text className="text-[11px] text-text-primary">{item.p2}</Text> : null}
            {item.p3 ? <Text className="text-[11px] text-text-primary">{item.p3}</Text> : null}
            {item.p4 ? <Text className="text-[11px] text-text-primary">{item.p4}</Text> : null}
            {item.p5 ? <Text className="text-[11px] text-text-primary">{item.p5}</Text> : null}
            {item.p6 ? <Text className="text-[11px] text-text-primary">{item.p6}</Text> : null}
            {item.p7 ? <Text className="text-base font-bold text-text-primary">{item.p7}</Text> : null}
          </>
        )}
        {variant === 'address' && (
          <Text className="text-base font-bold text-text-primary">{item.l_concat}</Text>
        )}
        {variant === 'user' && (
          <Text className="text-base font-bold text-text-primary">
            {item.mos_ru_street_p7} {item.mos_ru_address_l_concat}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function buildAccessibilityLabel(item: SuggestionData, variant: SuggestionVariant): string {
  if (variant === 'street') {
    return [item.p2, item.p3, item.p4, item.p5, item.p6, item.p7].filter(Boolean).join(', ');
  }
  if (variant === 'address') {
    return item.l_concat ?? '';
  }
  return `${item.mos_ru_street_p7 ?? ''} ${item.mos_ru_address_l_concat ?? ''}`.trim();
}
