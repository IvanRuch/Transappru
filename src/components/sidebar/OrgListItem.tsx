import React from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';

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
  /** Compact mode: radio dot + badge only, no text details (collapsed web sidebar) */
  compact?: boolean;
  /** Disable interactions (e.g. while another switch is in progress) */
  disabled?: boolean;
  /** This specific row is being switched to — show spinner, ignore further taps */
  loading?: boolean;
  /**
   * Mark this row as the currently-active organization. Renders a filled
   * radio indicator, drops the "auto count" display redundancy, and
   * becomes non-interactive (you can't "switch to yourself").
   */
  current?: boolean;
  /** Called with `inn` when a confirmed, non-current org row is tapped */
  onPress: (inn: string) => void;
}

const isTruthyFlag = (v: unknown) => v === 1 || v === '1';

/**
 * Single-select row for the organization switcher (web sidebar +
 * mobile left drawer). Visual affordance is a radio button — classic
 * single-select semantics:
 *
 *   ●  current org — filled, non-interactive
 *   ○  other org   — outlined, tap → switch
 *
 * In compact (collapsed web sidebar) mode the radio becomes the only
 * visible element, with the notification badge layered on the top-right.
 */
export const OrgListItem: React.FC<Props> = ({
  org,
  compact = false,
  disabled = false,
  loading = false,
  current = false,
  onPress,
}) => {
  const isUserConfirmed = isTruthyFlag(org.user_confirmed);
  const isPhoneConfirmed = isTruthyFlag(org.phone_inn_confirmed);
  const isConfirmed = isUserConfirmed && isPhoneConfirmed;

  const badgeCount = org.notification_unviewed_count || 0;

  // Current rows are single-select targets that you can't re-select; loading
  // takes precedence; disabled (another switch in progress) blocks taps too.
  const isInteractionBlocked = current || loading || disabled || !isConfirmed;

  const handlePress = () => {
    if (isInteractionBlocked) return;
    onPress(org.inn);
  };

  const a11yLabel = [
    'Организация',
    org.firm || org.inn,
    `ИНН ${org.inn}`,
    current && 'текущая',
    !isUserConfirmed && 'ИНН ожидает подтверждения',
    !isPhoneConfirmed && 'телефон ожидает подтверждения',
    badgeCount > 0 && `${badgeCount} новых уведомлений`,
    loading && 'идёт переключение',
  ]
    .filter(Boolean)
    .join(', ');

  const rowClassName = [
    'flex-row items-center',
    compact ? 'px-2 py-2' : 'px-3 py-2',
    !loading && !current && disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const webCursor =
    Platform.OS === 'web'
      ? ({ cursor: !isInteractionBlocked ? 'pointer' : 'default' } as any)
      : undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isInteractionBlocked}
      accessibilityRole={current ? 'radio' : 'button'}
      accessibilityLabel={a11yLabel}
      accessibilityState={{
        disabled: isInteractionBlocked && !current,
        busy: loading,
        selected: current,
        checked: current,
      }}
      className={rowClassName}
      style={webCursor}
    >
      {/* Radio indicator (or spinner if this row is switching) */}
      <View className="relative w-10 items-center justify-center" style={{ height: 28 }}>
        {loading ? (
          <ActivityIndicator size="small" color="#3A3A3A" />
        ) : (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: current ? '#3A3A3A' : '#B8B8B8',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            {current && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#3A3A3A',
                }}
              />
            )}
          </View>
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
