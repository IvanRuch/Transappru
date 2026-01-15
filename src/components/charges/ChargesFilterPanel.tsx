import React from 'react';
import { View, Text, TouchableHighlight, Image, StyleSheet, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ChargeFilterType = 'all' | 'gibdd' | 'paidRoads' | 'fssp' | 'fns';

interface ChargesFilterPanelProps {
  visible: boolean;
  activeFilter: ChargeFilterType;
  onSelectFilter: (filter: ChargeFilterType) => void;
  onClose: () => void;
}

export function ChargesFilterPanel({
  visible,
  activeFilter,
  onSelectFilter,
  onClose,
}: ChargesFilterPanelProps) {
  const insets = useSafeAreaInsets();
  
  const filters: { id: ChargeFilterType; label: string }[] = [
    { id: 'all', label: 'Все начисления' },
    { id: 'gibdd', label: 'Штрафы ГИБДД' },
    { id: 'paidRoads', label: 'Платные дороги (Платон, ЦКАД)' },
    { id: 'fssp', label: 'Исполнительные производства (ФССП)' },
    { id: 'fns', label: 'Налоги (ФНС)' },
  ];

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Фильтр начислений</Text>
          <TouchableHighlight
            activeOpacity={1}
            underlayColor="#f0f0f0"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Image source={require('../../../assets/images/xclose.png')} />
          </TouchableHighlight>
        </View>

        <ScrollView style={styles.scrollContent}>
          <View style={styles.container}>
            {filters.map((filter) => (
              <TouchableHighlight
                key={filter.id}
                style={styles.checkboxRow}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => {
                    onSelectFilter(filter.id);
                    onClose();
                }}
              >
                <View style={styles.checkboxContent}>
                  {/* Используем чекбоксы как радио-кнопки, так как иконки точно есть */}
                  <Image
                    source={
                      activeFilter === filter.id
                        ? require('../../../assets/images/checkbox_checked_2.png')
                        : require('../../../assets/images/checkbox_unchecked_2.png')
                    }
                  />
                  <Text style={[
                      styles.checkboxText, 
                      activeFilter === filter.id && styles.checkboxTextSelected
                  ]}>
                    {filter.label}
                  </Text>
                </View>
              </TouchableHighlight>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
  },
  closeButton: {
    padding: 5,
    borderRadius: 15,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  container: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  checkboxRow: {
    marginBottom: 20,
  },
  checkboxContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    paddingLeft: 15,
    fontSize: 16,
    fontWeight: 'normal',
    color: '#313131',
  },
  checkboxTextSelected: {
    fontWeight: 'bold',
    color: '#3A3A3A',
  },
});
