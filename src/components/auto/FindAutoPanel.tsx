import React, { useState } from 'react';
import { View, Text, TextInput, TouchableHighlight, TouchableOpacity, Image, StyleSheet, ScrollView, Platform, Keyboard } from 'react-native';
import Modal from 'react-native-modal';
import DateTimePicker from '../common/DateTimePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FindAutoPanelProps {
  visible: boolean;
  autoStr: string;
  autoCancelled: boolean;
  autoPassEnded: boolean;
  autoPassEnds: boolean;
  autoPassEndsUntilDate: string;
  onChangeAutoStr: (value: string) => void;
  onClearAutoStr: () => void;
  onClearAllFilters?: () => void;
  onToggleCancelled: () => void;
  onTogglePassEnded: () => void;
  onChangePassEndsDate: (value: string) => void;
  onClose: () => void;
}

export function FindAutoPanel({
  visible,
  autoStr,
  autoCancelled,
  autoPassEnded,
  autoPassEnds,
  autoPassEndsUntilDate,
  onChangeAutoStr,
  onClearAutoStr,
  onToggleCancelled,
  onTogglePassEnded,
  onChangePassEndsDate,
  onClearAllFilters,
  onClose,
}: FindAutoPanelProps) {
  const insets = useSafeAreaInsets();
  
  // Состояние для date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Парсинг даты из строки DD.MM.YYYY
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || dateStr.length !== 10) return new Date();
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day);
  };
  
  // Форматирование даты в DD.MM.YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  // Обработчик выбора даты
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      onChangePassEndsDate(formatDate(date));
    }
  };
  
  // Открытие date picker
  const openDatePicker = () => {
    Keyboard.dismiss(); // Убираем клавиатуру перед открытием date picker
    if (autoPassEndsUntilDate) {
      setSelectedDate(parseDate(autoPassEndsUntilDate));
    }
    setShowDatePicker(true);
  };
  
  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      style={styles.modal}
      avoidKeyboard={true} // This prop is from react-native-modal and helps
    >
      <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Заголовок с кнопкой закрытия */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Фильтр авто</Text>
          <TouchableHighlight
            activeOpacity={1}
            underlayColor="#f0f0f0"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Image source={require('../../../assets/images/xclose.png')} />
          </TouchableHighlight>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.container}>
              {/* Поле поиска */}
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder='введите номер авто (мин. 3 символа)'
                    placeholderTextColor='#313131'
                    onChangeText={onChangeAutoStr}
                    value={autoStr}
                    autoFocus={false}
                  />
                </View>
                {autoStr.length > 0 && (
                  <View style={styles.clearButtonWrapper}>
                    <TouchableHighlight
                      activeOpacity={1}
                      underlayColor="#ffffff"
                      onPress={onClearAutoStr}
                    >
                      <Image source={require('../../../assets/images/clear_2.png')} />
                    </TouchableHighlight>
                  </View>
                )}
              </View>
              
              {/* Подсказка о минимальной длине */}
              {autoStr.length > 0 && autoStr.length < 3 && (
                <Text style={styles.hintText}>
                  Введите минимум 3 символа для поиска
                </Text>
              )}

              <Text style={styles.sectionTitle}>Пропуск:</Text>

              {/* Аннулирован */}
              <TouchableHighlight
                style={styles.checkboxRow}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPressIn={() => Keyboard.dismiss()}
                onPress={onToggleCancelled}
              >
                <View style={styles.checkboxContent}>
                  <Image 
                    source={
                      autoCancelled
                        ? require('../../../assets/images/checkbox_checked_2.png')
                        : require('../../../assets/images/checkbox_unchecked_2.png')
                    }
                  />
                  <Text style={styles.checkboxText}>аннулирован</Text>
                </View>
              </TouchableHighlight>

              {/* Закончился */}
              <TouchableHighlight
                style={styles.checkboxRow}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPressIn={() => Keyboard.dismiss()}
                onPress={onTogglePassEnded}
              >
                <View style={styles.checkboxContent}>
                  <Image 
                    source={
                      autoPassEnded
                        ? require('../../../assets/images/checkbox_checked_2.png')
                        : require('../../../assets/images/checkbox_unchecked_2.png')
                    }
                  />
                  <Text style={styles.checkboxText}>закончился</Text>
                </View>
              </TouchableHighlight>

              {/* Заканчивается до */}
              <View style={styles.dateFilterRow}>
                <TouchableOpacity
                  onPress={openDatePicker}
                  style={styles.dateInputCompact}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: autoPassEndsUntilDate ? '#313131' : '#8C8C8C' 
                  }}>
                    {autoPassEndsUntilDate || '00.00.0000'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.dateFilterLabel}>
                  заканчивается до
                </Text>
                
                {autoPassEndsUntilDate && (
                  <TouchableOpacity
                    onPress={() => onChangePassEndsDate('')}
                    style={styles.clearDateButtonCompact}
                  >
                    <Image 
                      source={require('../../../assets/images/xclose_2.png')} 
                      style={styles.clearDateIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Date Picker */}
              {showDatePicker && (
                <View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    locale="ru-RU"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.datePickerDoneLink}
                    >
                      <Text style={styles.datePickerDoneLinkText}>
                        Готово
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

            </View>
        </ScrollView>

        {/* Кнопки действий */}
        <View style={styles.actionsContainer}>
          {onClearAllFilters && (autoStr || autoCancelled || autoPassEnded || autoPassEnds) ? (
            <TouchableOpacity
              onPress={() => {
                onClearAllFilters();
                onClose();
              }}
              style={styles.resetButton}
              activeOpacity={0.8}
            >
              <Text style={styles.resetButtonText}>Сбросить</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resetButtonPlaceholder} />
          )}
          <TouchableOpacity
            onPress={onClose}
            style={styles.applyButton}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>Применить</Text>
          </TouchableOpacity>
        </View>
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
    maxHeight: '80%', // Ограничиваем высоту, чтобы не занимать весь экран
  },
  scrollContent: {
    paddingBottom: 10,
  },
  scrollContentContainer: {
    paddingBottom: 20, // Дополнительный отступ снизу
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    marginTop: 10,
    marginBottom: 15,
    height: 50,
  },
  searchInputWrapper: {
    flex: 5,
    justifyContent: 'center',
  },
  searchInput: {
    paddingLeft: 20,
    fontSize: 16,
    color: '#313131',
  },
  clearButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 11, 
    color: '#FF9800', 
    marginTop: -10,
    marginBottom: 10,
    fontStyle: 'italic'
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#313131',
  },
  checkboxRow: {
    marginBottom: 15,
  },
  checkboxContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    paddingLeft: 10,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#313131',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateFilterLabel: {
    paddingLeft: 10,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#313131',
    flex: 1,
  },
  dateInputCompact: {
    width: 120,
    height: 45,
    paddingHorizontal: 10,
    borderColor: '#656565',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  clearDateButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#EE505A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  clearDateIcon: {
    width: 16,
    height: 16,
    tintColor: '#EE505A',
  },
  datePickerDoneLink: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  datePickerDoneLinkText: {
    fontSize: 16,
    color: '#3A9BDC',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EE505A',
    alignItems: 'center',
  },
  resetButtonPlaceholder: {
    flex: 1,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#EE505A',
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3A9BDC',
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
