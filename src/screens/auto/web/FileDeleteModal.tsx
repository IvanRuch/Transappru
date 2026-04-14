import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FileDeleteModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Удалить файл?</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Удалить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Отменить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    color: '#313131',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  confirmBtn: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontSize: 14, color: '#FFFFFF' },
  cancelBtn: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, color: '#313131' },
});
