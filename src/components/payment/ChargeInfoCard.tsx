import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChargeItem } from '../../types/charges';

interface ChargeInfoCardProps {
  charges: ChargeItem[];
  isSingle: boolean;
  firstCharge: ChargeItem;
  /** Collapsed (false) shows only 3 items in multi mode; expanded shows all. */
  showAll: boolean;
  onToggleShowAll: () => void;
}

/**
 * First card on the payment confirm screen: either detailed info for a
 * single charge, or a collapsible list of multiple charges with
 * "Show more / Hide" toggle.
 */
export default function ChargeInfoCard({
  charges, isSingle, firstCharge, showAll, onToggleShowAll,
}: ChargeInfoCardProps) {
  return (
    <View className="bg-[#F8F8F8] rounded-xl p-5 mb-5 border border-border-secondary">
      <Text className="text-lg font-bold text-text-primary mb-4 select-none">
        {isSingle ? 'Информация о начислении' : `Оплата ${charges.length} начислений`}
      </Text>

      {isSingle ? (
        <>
          <InfoRow label="Нарушение:" value={firstCharge.dat} />
          <InfoRow label="Статья КОАП:" value={firstCharge.code} />
          <InfoRow label="Постановление:" value={firstCharge.uin} />
          <InfoRow label="Орган:" value={firstCharge.vendor ?? ''} />
        </>
      ) : (
        <View>
          {(showAll ? charges : charges.slice(0, 3)).map((charge, idx, visible) => (
            <ChargeRow
              key={charge.id ?? idx}
              charge={charge}
              isLast={idx === visible.length - 1}
            />
          ))}
          {charges.length > 3 && (
            <Pressable
              className="items-center py-2.5 cursor-pointer"
              onPress={onToggleShowAll}
              accessibilityRole="button"
              accessibilityLabel={showAll ? 'Скрыть' : `Показать ещё ${charges.length - 3}`}
            >
              <Text className="text-accent-secondary font-bold select-none">
                {showAll ? 'Скрыть' : `Показать ещё ${charges.length - 3}`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-2.5">
      <Text className="flex-1 text-sm text-text-secondary select-none">{label}</Text>
      <Text className="flex-[2] text-sm text-text-primary text-right">{value}</Text>
    </View>
  );
}

function ChargeRow({ charge, isLast }: { charge: ChargeItem; isLast: boolean }) {
  const isPlaton = charge.is_platon === '1' || (charge.is_platon as unknown as number) === 1;
  const autoNumber = (charge as any)._auto_number || (charge as any).user_auto?.auto_number;

  let description = '';
  if (isPlaton) {
    description = 'Платон';
  } else {
    const parts: string[] = [];
    if (charge.code) parts.push(charge.code);
    if (charge.description) parts.push(charge.description);
    description = parts.join(' — ');
  }

  const metaParts: string[] = [];
  if (autoNumber && autoNumber !== 'Неизвестно') metaParts.push(autoNumber);
  if (charge.dat) metaParts.push(charge.dat);
  const metaText = metaParts.join(' • ');

  return (
    <View className="mb-2.5">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2.5">
          {metaText ? (
            <Text className="text-xs text-text-secondary mb-0.5 select-none">{metaText}</Text>
          ) : null}
          <Text className="text-sm text-text-primary font-medium" numberOfLines={2}>
            {description}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-text-primary">{charge.sum} ₽</Text>
        </View>
      </View>
      {!isLast && <View className="h-px bg-[#E0E0E0] my-2.5" />}
    </View>
  );
}
