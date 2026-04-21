import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { ChargeItem } from '../../types/charges';

interface ChargeCardProps {
  item: ChargeItem;
  /** Show "Not linked to a vehicle" note for "other" charges list. */
  showAutoInfo?: boolean;
  /** Navigate to the charge detail screen. */
  onPress?: (item: ChargeItem) => void;
  /** Checkbox selected state — only meaningful when `onSelect` is provided. */
  selected?: boolean;
  /** Opt-in selection — when omitted, the card shows a status icon instead. */
  onSelect?: (item: ChargeItem) => void;
}

/**
 * Cross-platform charge card. Layout: left = status icon or selection
 * checkbox, center = description / amount / meta, right = navigation arrow.
 * Status & navigation icons come from PNG assets to stay on-brand on both
 * mobile and web.
 */
export const ChargeCard: React.FC<ChargeCardProps> = ({
  item,
  showAutoInfo = false,
  onPress,
  selected = false,
  onSelect,
}) => {
  const isPaid = item.is_paid === '1' || (item.is_paid as unknown as number) === 1;
  const isPlaton = item.is_platon === '1' || (item.is_platon as unknown as number) === 1;
  const isFssp = item.is_to_fssp === '1' || (item.is_to_fssp as unknown as number) === 1;

  return (
    <View
      className="flex-row mx-5 my-1 p-2.5 rounded-lg border bg-bg-secondary border-border-primary"
      accessibilityLabel={`Штраф ${item.sum} рублей. ${item.description}`}
    >
      {/* Left: checkbox or status icon */}
      <View className="w-10 items-center justify-center">
        {onSelect && !isPaid ? (
          <Pressable
            onPress={() => onSelect(item)}
            className="p-1 cursor-pointer"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={selected ? 'Снять выбор' : 'Выбрать для оплаты'}
          >
            <View
              className={`w-6 h-6 rounded border-2 border-accent-secondary items-center justify-center ${
                selected ? 'bg-accent-secondary' : 'bg-white'
              }`}
            >
              {selected && <Text className="text-white font-bold">✓</Text>}
            </View>
          </Pressable>
        ) : (
          <Image
            source={
              isPaid
                ? require('../../../assets/images/uil_check_2.png')
                : require('../../../assets/images/uil_exclamation-triangle_2.png')
            }
            accessibilityIgnoresInvertColors
          />
        )}
      </View>

      {/* Center: text block */}
      <View className="flex-1 pl-2.5">
        <Text className="text-sm text-text-primary mb-0.5 select-none">
          Постановление от {item.dat}
        </Text>
        {isPlaton ? (
          <Text className="text-sm text-status-error mb-0.5 select-none">
            Штраф системы ПЛАТОН {item.sum} ₽
          </Text>
        ) : (
          <Text className="text-sm text-text-primary mb-0.5 select-none">
            Штраф {item.sum} ₽
          </Text>
        )}
        {isFssp && (
          <Text className="text-sm text-status-error mb-0.5 select-none">
            Передано в ФССП {item.to_fssp_at}
          </Text>
        )}
        {item.discount_str && (
          <Text className="text-sm text-text-primary mb-0.5 select-none">
            {item.discount_str}
          </Text>
        )}
        <Text className="text-sm text-text-primary mb-0.5 select-none">
          {item.description}
        </Text>
        {item.offence_place && (
          <Text className="text-xs text-text-secondary mb-0.5 select-none">
            {item.offence_place}
          </Text>
        )}
        {showAutoInfo && !item.user_auto && (
          <View className="mt-1 pt-1 border-t border-[#D0D0D0]">
            <Text className="text-xs italic text-[#909090] select-none">
              Не привязано к авто
            </Text>
          </View>
        )}
      </View>

      {/* Right: navigation arrow */}
      {onPress && (
        <Pressable
          onPress={() => onPress(item)}
          className="justify-center p-2.5 cursor-pointer"
          accessibilityRole="button"
          accessibilityLabel="Открыть детали штрафа"
        >
          <Image source={require('../../../assets/images/arrow_to_right_2.png')} accessibilityIgnoresInvertColors />
        </Pressable>
      )}
    </View>
  );
};

export default ChargeCard;
