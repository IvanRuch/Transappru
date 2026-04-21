import React from 'react';
import { View, Text, Pressable } from 'react-native';

export interface FineTypeBreakdown {
  gibdd?: { count: number; sum: number };
  platon?: { count: number; sum: number };
}

interface ChargesGroupCardProps {
  /** Main group title, e.g. "ГРЗ: А123БВ78". */
  title: string;
  /** Subtitle line, e.g. "5 шт. • 1500.00 ₽". */
  subtitle?: string;
  /**
   * Single-kind hint appended inline to the subtitle, e.g. "(ГИБДД)" or
   * "(ПЛАТОН)". Shown when all fines are of the same kind.
   */
  inlineKindTag?: 'gibdd' | 'platon' | null;
  /**
   * Detailed kind breakdown on a separate line — shown when a group has
   * both kinds. When absent, only the subtitle is rendered.
   */
  detailedStats?: FineTypeBreakdown | null;
  /** Optional "Selected: X шт. • Y ₽" line shown under stats. */
  selectionHint?: string | null;

  /** Whether to show the master checkbox before the title. */
  showCheckbox?: boolean;
  /** Whether the checkbox is in "all selected" state. */
  isAllSelected?: boolean;
  /** Tap handler for the master checkbox. */
  onToggleAllSelection?: () => void;

  /** Is the body area expanded? */
  isExpanded: boolean;
  /** Tap handler for the header row (expand/collapse). */
  onToggleExpand: () => void;

  /** Body content — rendered only when expanded. */
  children?: React.ReactNode;
}

/**
 * Presentation-only card for a charges group (one auto or logical bucket).
 * Header row: optional checkbox + title + subtitle + stats + expand chevron.
 * Body: arbitrary children rendered when expanded.
 *
 * All business logic (stats computation, selection state) is computed by
 * the caller and passed in — see useChargesSelection.
 */
export default function ChargesGroupCard({
  title, subtitle, inlineKindTag, detailedStats, selectionHint,
  showCheckbox, isAllSelected, onToggleAllSelection,
  isExpanded, onToggleExpand,
  children,
}: ChargesGroupCardProps) {
  return (
    <View className="mx-4 mt-2 bg-white rounded-[10px] overflow-hidden border border-[#E8E8E8]">
      <View className="flex-row items-center py-3 px-3.5">
        {showCheckbox && (
          <Pressable
            onPress={onToggleAllSelection}
            className="p-1 mr-2 cursor-pointer"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!isAllSelected }}
            accessibilityLabel={isAllSelected ? 'Снять выбор со всех' : 'Выбрать все'}
          >
            <View
              className={`w-6 h-6 rounded border-2 border-accent-secondary items-center justify-center ${
                isAllSelected ? 'bg-accent-secondary' : 'bg-white'
              }`}
            >
              {isAllSelected && <Text className="text-white font-bold">✓</Text>}
            </View>
          </Pressable>
        )}

        <Pressable
          className="flex-1 flex-row items-center cursor-pointer"
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${isExpanded ? 'Свернуть' : 'Развернуть'}`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-text-primary select-none">{title}</Text>
            {subtitle && (
              <Text className="text-[13px] text-text-secondary mt-0.5 select-none">
                {subtitle}
                {inlineKindTag === 'gibdd' && (
                  <Text className="text-[11px] text-[#B0B0B0]"> (ГИБДД)</Text>
                )}
                {inlineKindTag === 'platon' && (
                  <Text className="text-[11px] text-status-error"> (ПЛАТОН)</Text>
                )}
              </Text>
            )}

            {detailedStats?.gibdd && detailedStats?.platon && (
              <View className="mt-0.5">
                <Text className="text-[11px] text-[#B0B0B0] select-none">
                  ГИБДД: {detailedStats.gibdd.count} шт. • {detailedStats.gibdd.sum.toFixed(2)} ₽
                </Text>
                <Text className="text-[11px] text-status-error select-none">
                  ПЛАТОН: {detailedStats.platon.count} шт. • {detailedStats.platon.sum.toFixed(2)} ₽
                </Text>
              </View>
            )}

            {selectionHint && (
              <Text className="text-xs text-status-error font-medium mt-0.5 select-none">
                {selectionHint}
              </Text>
            )}
          </View>
          <Text className="text-[13px] text-text-muted ml-2 select-none">
            {isExpanded ? '▼' : '▶'}
          </Text>
        </Pressable>
      </View>

      {isExpanded && (
        <View className="border-t border-[#F0F0F0] py-2">
          {children}
        </View>
      )}
    </View>
  );
}
