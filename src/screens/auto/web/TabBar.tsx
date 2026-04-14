import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import type { TabKey } from './useAutoDetail';

const TABS: { key: TabKey; label: string; icon?: any; iconChecked?: any }[] = [
  { key: 'passes',          label: 'Пропуск',         icon: require('../../../../assets/images/tab_passes_2.png'),          iconChecked: require('../../../../assets/images/tab_passes_checked_2.png') },
  { key: 'fines',           label: 'Штрафы',           icon: require('../../../../assets/images/tab_fines_2.png'),            iconChecked: require('../../../../assets/images/tab_fines_checked_2.png') },
  { key: 'avtodor',         label: 'Платные дороги',   icon: require('../../../../assets/images/tab_avtodor_2.png'),          iconChecked: require('../../../../assets/images/tab_avtodor_checked_2.png') },
  { key: 'osago',           label: 'ОСАГО',            icon: require('../../../../assets/images/tab_osago_2.png'),            iconChecked: require('../../../../assets/images/tab_osago_checked_2.png') },
  { key: 'diagnostic_card', label: 'Диагн. карта',     icon: require('../../../../assets/images/tab_diagnostic_card_2.png'),  iconChecked: require('../../../../assets/images/tab_diagnostic_card_checked_2.png') },
  { key: 'rnis',            label: 'РНИС',             icon: require('../../../../assets/images/tab_rnis_2.png'),             iconChecked: require('../../../../assets/images/tab_rnis_checked_2.png') },
  { key: 'files',           label: 'Файлы',            icon: require('../../../../assets/images/tab_files_2.png'),            iconChecked: require('../../../../assets/images/tab_files_checked_2.png') },
  { key: 'driver',          label: 'Водители',         icon: require('../../../../assets/images/tab_driver_2.png') },
];

interface TabBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isDesktop: boolean;
}

export function TabBar({ currentTab, onTabChange, isDesktop }: TabBarProps) {
  const content = TABS.map(tab => {
    const isActive = currentTab === tab.key && tab.key !== 'driver';
    const icon = isActive && tab.iconChecked ? tab.iconChecked : tab.icon;

    return (
      <Pressable key={tab.key} onPress={() => onTabChange(tab.key)}>
        <View style={[styles.tab, isActive && styles.tabActive]}>
          {icon && <Image source={icon} style={styles.tabIcon} resizeMode="contain" />}
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
        </View>
      </Pressable>
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
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    minWidth: 90,
  },
  tabActive: {
    backgroundColor: '#3A3A3A',
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#313131',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
});
