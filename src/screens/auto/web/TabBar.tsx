import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Image, Platform,
  type NativeSyntheticEvent, type NativeScrollEvent, type LayoutChangeEvent,
} from 'react-native';
import type { TabKey } from './useAutoDetail';

const TABS: { key: TabKey; label: string; icon?: any; iconChecked?: any }[] = [
  { key: 'passes',          label: 'Пропуск',              icon: require('../../../../assets/images/tab_passes_2.png'),          iconChecked: require('../../../../assets/images/tab_passes_checked_2.png') },
  { key: 'fines',           label: 'Штрафы',               icon: require('../../../../assets/images/tab_fines_2.png'),            iconChecked: require('../../../../assets/images/tab_fines_checked_2.png') },
  { key: 'avtodor',         label: 'Платные дороги',        icon: require('../../../../assets/images/tab_avtodor_2.png'),          iconChecked: require('../../../../assets/images/tab_avtodor_checked_2.png') },
  { key: 'osago',           label: 'ОСАГО',                 icon: require('../../../../assets/images/tab_osago_2.png'),            iconChecked: require('../../../../assets/images/tab_osago_checked_2.png') },
  { key: 'diagnostic_card', label: 'Диагностическая\nкарта', icon: require('../../../../assets/images/tab_diagnostic_card_2.png'), iconChecked: require('../../../../assets/images/tab_diagnostic_card_checked_2.png') },
  { key: 'rnis',            label: 'РНИС',                  icon: require('../../../../assets/images/tab_rnis_2.png'),             iconChecked: require('../../../../assets/images/tab_rnis_checked_2.png') },
  { key: 'files',           label: 'Файлы',                 icon: require('../../../../assets/images/tab_files_2.png'),            iconChecked: require('../../../../assets/images/tab_files_checked_2.png') },
  { key: 'driver',          label: 'Водители',              icon: require('../../../../assets/images/tab_driver_2.png') },
];

const SCROLL_STEP = 220;

// ── Single tab item ──────────────────────────────────────────────────────────

interface TabItemProps {
  label: string;
  icon: any;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ label, icon, isActive, onPress }: TabItemProps) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.tab, isActive && styles.tabActive]}>
        {icon && <Image source={icon} style={styles.tabIcon} resizeMode="contain" />}
        <Text
          style={[styles.tabLabel, isActive && styles.tabLabelActive]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Scroll arrow button ──────────────────────────────────────────────────────

function ScrollArrow({ direction, onPress }: { direction: 'left' | 'right'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.arrow, direction === 'left' ? styles.arrowLeft : styles.arrowRight]}
    >
      <Text style={styles.arrowText}>{direction === 'left' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isDesktop: boolean;
}

export function TabBar({ currentTab, onTabChange, isDesktop }: TabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollX = useRef(0);
  const contentW = useRef(0);
  const containerW = useRef(0);

  const updateArrows = useCallback(() => {
    const maxScroll = contentW.current - containerW.current;
    setCanScrollLeft(scrollX.current > 4);
    setCanScrollRight(maxScroll - scrollX.current > 4);
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    updateArrows();
  }, [updateArrows]);

  const onContentSizeChange = useCallback((w: number) => {
    contentW.current = w;
    updateArrows();
  }, [updateArrows]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    containerW.current = e.nativeEvent.layout.width;
    updateArrows();
  }, [updateArrows]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const target = scrollX.current + (dir === 'right' ? SCROLL_STEP : -SCROLL_STEP);
    scrollRef.current?.scrollTo({ x: Math.max(0, target), animated: true });
  }, []);

  const content = TABS.map(tab => {
    const isActive = currentTab === tab.key;
    const icon = isActive && tab.iconChecked ? tab.iconChecked : tab.icon;

    return (
      <TabItem
        key={tab.key}
        label={tab.label}
        icon={icon}
        isActive={isActive}
        onPress={() => onTabChange(tab.key)}
      />
    );
  });

  if (isDesktop) {
    return (
      <View style={styles.container}>
        <View style={styles.desktopRow}>{content}</View>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {canScrollLeft && <ScrollArrow direction="left" onPress={() => scroll('left')} />}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
      {canScrollRight && <ScrollArrow direction="right" onPress={() => scroll('right')} />}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    position: 'relative',
  },
  desktopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#EAECF0',
    borderBottomColor: '#3A3A3A',
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
    ...noSelect,
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },

  // Scroll arrows
  arrow: {
    position: 'absolute',
    top: 0,
    bottom: 1,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  arrowLeft: {
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  arrowRight: {
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  arrowText: {
    fontSize: 24,
    color: '#3A3A3A',
    fontWeight: '300',
    ...noSelect,
  },
});
