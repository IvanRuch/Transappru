import React, { useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableHighlight, ActivityIndicator, Image, ImageBackground, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafariAutofillFix } from '../../../hooks/useSafariAutofillFix';
import { PlateField } from '../../common';

interface AddAutoModalProps {
  visible: boolean;
  autoNumberBase: string;
  autoNumberBaseOk: boolean;
  autoNumberRegionCode: string;
  autoNumberRegionCodeOk: boolean;
  sts: string;
  stsOk: boolean;
  stsByAutoNumberIndicator: boolean;
  modalAddAutoButtonDisabled: boolean;
  onChangeAutoNumberBase: (value: string) => void;
  onChangeAutoNumberRegionCode: (value: string) => void;
  onChangeSts: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const AddAutoModal: React.FC<AddAutoModalProps> = ({
  visible,
  autoNumberBase,
  autoNumberBaseOk,
  autoNumberRegionCode,
  autoNumberRegionCodeOk,
  sts,
  stsOk,
  stsByAutoNumberIndicator,
  modalAddAutoButtonDisabled,
  onChangeAutoNumberBase,
  onChangeAutoNumberRegionCode,
  onChangeSts,
  onSubmit,
  onCancel,
}) => {
  const stsRef = useRef<any>(null);

  // Web: STS input still needs the Safari autofill suppression. Plate inputs
  // get their own fix internally via `PlateField` — ref counting inside
  // `useSafariAutofillFix` keeps the concurrent consumers safe.
  useSafariAutofillFix([stsRef], visible);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Заголовок с кнопкой закрытия */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Добавить авто</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableHighlight
                  style={styles.closeButton}
                  activeOpacity={1}
                  underlayColor='#FFFFFF'
                  onPress={onCancel}
                >
                  <Image source={require('../../../../assets/images/xclose_2.png')} />
                </TouchableHighlight>
              </View>
            </View>

            {/* Описание */}
            <Text style={styles.description}>
              Добавьте данные автомобиля и Вы сможете подать заявку на получение пропуска.{"\n"}{"\n"}
              Проверяйте сроки действия пропусков, полиса ОСАГО, диагностической карты, наличие штрафов по Вашему автомобилю
            </Text>

            {/* Блок ввода номера */}
            <View style={styles.inputSection}>
              <PlateField
                label="Государственный регистрационный знак:"
                base={autoNumberBase}
                region={autoNumberRegionCode}
                onChangeBase={onChangeAutoNumberBase}
                onChangeRegion={onChangeAutoNumberRegionCode}
                style={styles.plateCard}
              />

              {/* Блок ввода СТС */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Свидетельство о регистрации ТС:</Text>
                <View style={styles.stsContainer}>
                  <View style={styles.stsWrapper}>
                    {stsByAutoNumberIndicator ? (
                      <ActivityIndicator size="large" color="#313131" animating={true} />
                    ) : (
                      <ImageBackground
                        source={require('../../../../assets/images/scale_2400_1.png')}
                        resizeMode="cover"
                        style={styles.stsBackground}
                      >
                        <TextInput
                          ref={stsRef}
                          style={styles.stsInput}
                          maxLength={10}
                          placeholder='0000000000'
                          placeholderTextColor={'#E8E8E8'}
                          onChangeText={onChangeSts}
                          value={sts}
                        />
                      </ImageBackground>
                    )}
                  </View>
                </View>
              </View>

              {/* Кнопка добавить */}
              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <TouchableHighlight
                    style={[
                      styles.addButton,
                      { backgroundColor: modalAddAutoButtonDisabled ? '#C0C0C0' : '#3A3A3A' }
                    ]}
                    activeOpacity={1}
                    underlayColor={modalAddAutoButtonDisabled ? '#C0C0C0' : '#2A2A2A'}
                    onPress={onSubmit}
                    disabled={modalAddAutoButtonDisabled}
                  >
                    <Text style={[
                      styles.addButtonText,
                      { color: modalAddAutoButtonDisabled ? '#E8E8E8' : '#FFFFFF' }
                    ]}>
                      Добавить
                    </Text>
                  </TouchableHighlight>
                </View>
              </View>
            </View>
          </Pressable>
        </View>
        </ScrollView>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
  },
  headerLeft: {
    flex: 5,
    alignItems: 'flex-start',
  },
  headerTitle: {
    paddingLeft: 16,
    paddingTop: 26,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 30,
  },
  description: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    fontSize: 16,
    fontWeight: 'normal',
    color: '#4C4C4C',
  },
  inputSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 25,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#313131',
  },
  // Same vertical gap that the old `inputContainer` provided via marginTop.
  plateCard: {
    marginTop: 24,
  },
  stsContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  stsWrapper: {
    width: 305,
    height: 80,
    justifyContent: 'center',
  },
  stsBackground: {
    width: 305,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stsInput: {
    fontSize: 37,
    textAlign: 'center',
    ...Platform.select({
      web: { padding: 0, width: '100%', height: '100%' },
      default: { paddingTop: 5 },
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  buttonWrapper: {
    flex: 1,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 305,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
