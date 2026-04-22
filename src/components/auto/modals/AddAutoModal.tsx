import React, { useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableHighlight, ActivityIndicator, Image, ImageBackground, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafariAutofillFix } from '../../../hooks/useSafariAutofillFix';

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
  const plateBaseRef = useRef<any>(null);
  const plateRegionRef = useRef<any>(null);
  const stsRef = useRef<any>(null);

  // Web: hide Safari autofill overlay + strip RN attrs that trigger it.
  // Gated by `visible` so we don't mount DOM state while the modal is closed.
  useSafariAutofillFix([plateBaseRef, plateRegionRef, stsRef], visible);

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
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Государственный регистрационный знак:</Text>
                <View style={styles.plateContainer}>
                  <View style={styles.plateRow}>
                    {/* Основная часть номера */}
                    <View style={styles.plateBase}>
                      <TextInput
                        ref={plateBaseRef}
                        style={styles.plateBaseInput}
                        maxLength={6}
                        placeholder='А000АА'
                        placeholderTextColor={'#B8B8B8'}
                        onChangeText={onChangeAutoNumberBase}
                        value={autoNumberBase}
                      />
                    </View>
                    {/* Разделитель */}
                    <View style={styles.plateSeparator} />
                    {/* Регион */}
                    <View style={styles.plateRegion}>
                      <TextInput
                        ref={plateRegionRef}
                        keyboardType='numeric'
                        style={styles.plateRegionInput}
                        maxLength={3}
                        placeholder='777'
                        placeholderTextColor={'#B8B8B8'}
                        onChangeText={onChangeAutoNumberRegionCode}
                        value={autoNumberRegionCode}
                      />
                      <View style={styles.plateRegionBottom}>
                        <Text style={styles.plateRegionText}>RUS</Text>
                        <Image source={require('../../../../assets/images/flag_rus.png')} style={styles.flagImage} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

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
  plateContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  plateRow: {
    flexDirection: 'row',
    width: 305,
    height: 80,
  },
  plateBase: {
    flex: 188,
    backgroundColor: '#FFFFFF',
    height: 80,
    borderBottomLeftRadius: 8,
    borderTopLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  plateBaseInput: {
    fontSize: 34,
    textAlign: 'center',
    ...Platform.select({
      web: { padding: 0, width: '100%', height: '100%' },
      default: { paddingTop: 5 },
    }),
  },
  plateSeparator: {
    flex: 1,
    backgroundColor: '#B8B8B8',
    height: 80,
  },
  plateRegion: {
    flex: 114,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    height: 80,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  plateRegionInput: {
    height: 55,
    fontSize: 34,
    textAlign: 'center',
    ...Platform.select({
      web: { padding: 0, width: '100%' },
      default: { paddingBottom: -10 },
    }),
  },
  plateRegionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 25,
  },
  plateRegionText: {
    paddingRight: 5,
    fontSize: 16,
    color: '#2c2c2c',
  },
  flagImage: {
    width: 24,
    height: 12,
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
