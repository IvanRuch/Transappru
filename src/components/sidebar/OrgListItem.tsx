import React from 'react';
import { View, Text, Image, Pressable, Platform, ActivityIndicator } from 'react-native';

export interface OrgListItemData {
  inn: string;
  firm?: string;
  user_auto_count?: number | string;
  user_confirmed?: number | string;
  phone_inn_confirmed?: number | string;
  notification_unviewed_count?: number;
}

interface Props {
  org: OrgListItemData;
  /** Compact mode: icon + badge only, no text details (collapsed web sidebar) */
  compact?: boolean;
  /** Disable interactions (e.g. while another switch is in progress) */
  disabled?: boolean;
  /** This specific row is being switched to — show spinner, ignore further taps */
  loading?: boolean;
  /** Called with `inn` when a confirmed org row is tapped */
  onPress: (inn: string) => void;
}

const isTruthyFlag = (v: unknown) => v === 1 || v === '1';

/**
 * Shared organization row for the sidebar / left-menu drawer.
 * Shows firm + INN + auto count + optional confirmation warnings.
 * Tap only fires onPress if org is fully confirmed (user_confirmed && phone_inn_confirmed).
 */
export const OrgListItem: React.FC<Props> = ({
  org,
  compact = false,
  disabled = false,
  loading = false,
  onPress,
}) => {
  const isUserConfirmed = isTruthyFlag(org.user_confirmed);
  const isPhoneConfirmed = isTruthyFlag(org.phone_inn_confirmed);
  const isConfirmed = isUserConfirmed && isPhoneConfirmed;

  const badgeCount = org.notification_unviewed_count || 0;

  // Loading takes precedence: this row is being processed, ignore all taps.
  const isInteractionBlocked = loading || disabled || !isConfirmed;

  const handlePress = () => {
    if (isInteractionBlocked) return;
    onPress(org.inn);
  };

  const a11yLabel = [
    'Организация',
    org.firm || org.inn,
    `ИНН ${org.inn}`,
    !isUserConfirmed && 'ИНН ожидает подтверждения',
    !isPhoneConfirmed && 'телефон ожидает подтверждения',
    badgeCount > 0 && `${badgeCount} новых уведомлений`,
    loading && 'идёт переключение',
  ]
    .filter(Boolean)
    .join(', ');

  // Loading row keeps full opacity (it's the active target); other disabled
  // rows get dimmed so the user's focus stays on the one being switched to.
  const rowClassName = [
    'flex-row items-center',
    compact ? 'px-2 py-2' : 'px-3 py-2',
    !loading && disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const webCursor =
    Platform.OS === 'web'
      ? ({ cursor: isConfirmed && !isInteractionBlocked ? 'pointer' : 'default' } as any)
      : undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isInteractionBlocked}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: isInteractionBlocked, busy: loading }}
      className={rowClassName}
      style={webCursor}
    >
      {/* Icon + badge (in compact+loading mode the icon is replaced by a spinner) */}
      <View className="relative w-10 items-center justify-center" style={{ height: 28 }}>
        {compact && loading ? (
          <ActivityIndicator size="small" color="#3A3A3A" />
        ) : (
          <Image
            source={require('../../../assets/images/menu_left_other_user.png')}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
          />
        )}
        {badgeCount > 0 && !loading && (
          <View
            className="absolute rounded-full bg-status-error items-center justify-center px-1"
            style={{ top: -4, right: -2, minWidth: 16, height: 16 }}
          >
            <Text
              className="text-white font-bold"
              style={{ fontSize: 9 }}
              numberOfLines={1}
            >
              {badgeCount > 99 ? '99+' : String(badgeCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Details (hidden in compact mode) */}
      {!compact && (
        <View className="flex-1 pl-3 pr-2">
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            className={
              isConfirmed
                ? 'text-sm font-bold text-text-primary'
                : 'text-sm text-text-secondary'
            }
          >
            {org.firm || org.inn}
          </Text>

          <Text
            className={
              isConfirmed
                ? 'text-xs text-text-primary mt-0.5'
                : 'text-xs text-text-secondary mt-0.5'
            }
          >
            инн: {org.inn}
          </Text>

          <Text className="text-xs text-text-primary mt-0.5">
            количество авто: {org.user_auto_count || 0}
          </Text>

          {!isUserConfirmed && (
            <Text className="text-xs text-text-secondary mt-0.5">
              инн ожидает подтверждения
            </Text>
          )}
          {!isPhoneConfirmed && (
            <Text className="text-xs text-text-secondary mt-0.5">
              телефон ожидает подтверждения
            </Text>
          )}

          {loading && (
            <Text className="text-xs text-accent-primary mt-1 font-semibold">
              Переключаюсь…
            </Text>
          )}
        </View>
      )}

      {/* Trailing spinner for expanded rows */}
      {!compact && loading && (
        <View className="pl-2 justify-center" style={{ minWidth: 20 }}>
          <ActivityIndicator size="small" color="#3A3A3A" />
        </View>
      )}
    </Pressable>
  );
};
