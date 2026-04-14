import React, { useRef } from 'react';
import { View, Text, Image, TouchableHighlight, TouchableOpacity, Pressable, TextInput, Modal, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  autoNumber: string;
  fileItem: any;
  onChangeDescription: (value: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteFilePress: (item: any) => void;
  onClose: () => void;
}

export function FileEditModal({ visible, autoNumber, fileItem, onChangeDescription, onUploadFile, onDeleteFilePress, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Файлы по авто {autoNumber}</Text>
            <TouchableHighlight
              style={styles.closeBtn}
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={onClose}
            >
              <Image source={require('../../../../assets/images/xclose_2.png')} />
            </TouchableHighlight>
          </View>

          {/* Upload area */}
          <View style={styles.uploadArea}>
            <View style={styles.descriptionRow}>
              <Text style={styles.descriptionLabel}>Комментарий к документам:</Text>
              <TextInput
                multiline
                numberOfLines={2}
                style={styles.descriptionInput}
                onChangeText={onChangeDescription}
                value={fileItem.description}
              />
            </View>

            <Pressable onPress={handlePickFile}>
              <View style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>загрузить документы</Text>
              </View>
            </Pressable>

            {/* Hidden file input for web */}
            <input
              ref={fileInputRef as any}
              type="file"
              onChange={handleFileSelected as any}
              style={{ display: 'none' }}
            />
          </View>

          {/* File list */}
          {fileItem.file_data?.map((item: any) => (
            <View key={item.id} style={styles.fileRow}>
              <View style={styles.fileThumbnailWrap}>
                {item.file_mini !== '' ? (
                  <Image source={{ uri: item.file_mini }} style={styles.fileThumbnail} resizeMode="cover" />
                ) : (
                  <Text style={styles.fileExt}>{item.ext}</Text>
                )}
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{item.filename}</Text>
                <Text style={styles.fileDate}>{item.ts}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteFilePress(item)}>
                <Image source={require('../../../../assets/images/xdelete_red.png')} style={{ width: 24, height: 24 }} />
              </TouchableOpacity>
            </View>
          ))}
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
    padding: 20,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 600,
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: { fontSize: 20, color: '#313131', flex: 1 },
  closeBtn: { padding: 8, borderRadius: 8 },
  uploadArea: {
    margin: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B8B8B8',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  descriptionLabel: { flex: 3, fontSize: 14, color: '#2C2C2C', paddingTop: 8 },
  descriptionInput: {
    flex: 4,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    color: '#313131',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  uploadButton: {
    padding: 12,
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  fileRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fileThumbnailWrap: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileThumbnail: { width: 40, height: 40, borderRadius: 5 },
  fileExt: { fontSize: 13, color: '#2B2D33' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: 'bold', color: '#313131' },
  fileDate: { fontSize: 12, color: '#313131' },
  deleteBtn: { padding: 8, justifyContent: 'center' },
});
