import React from 'react';
import { View, Text, Image, TouchableHighlight, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { FileEditModal } from './FileEditModal';
import { FileDeleteModal } from './FileDeleteModal';

interface Props {
  loading: boolean;
  filesData: any[];
  fileItem: any;
  autoNumber: string;
  editModalVisible: boolean;
  deleteModalVisible: boolean;
  onOpenEditModal: (mode: string, item?: any) => void;
  onCloseEditModal: () => void;
  onChangeDescription: (value: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteFile: () => void;
  onDeleteFilePress: (item: any) => void;
  onCancelDelete: () => void;
  onDownloadFile: (item: any) => void;
}

export function FilesTab({
  loading,
  filesData,
  fileItem,
  autoNumber,
  editModalVisible,
  deleteModalVisible,
  onOpenEditModal,
  onCloseEditModal,
  onChangeDescription,
  onUploadFile,
  onDeleteFile,
  onDeleteFilePress,
  onCancelDelete,
  onDownloadFile,
}: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  return (
    <View>
      {/* Add button */}
      <TouchableHighlight
        style={styles.addBtn}
        activeOpacity={1}
        underlayColor="#F0F0F0"
        onPress={() => onOpenEditModal('add')}
      >
        <View style={styles.addBtnInner}>
          <Image source={require('../../../../assets/images/add_button_2.png')} />
          <Text style={styles.addBtnText}>Добавить</Text>
        </View>
      </TouchableHighlight>

      {/* File groups */}
      {filesData.length > 0 ? (
        filesData.map(item => (
          <View key={item.id} style={styles.fileGroup}>
            <View style={styles.fileGroupContent}>
              {item.description !== '' && (
                <Text style={styles.groupTitle}>{item.description}</Text>
              )}
              <View style={styles.thumbnailRow}>
                {item.file_data.map((fileInner: any) => (
                  <Pressable key={fileInner.id} onPress={() => onDownloadFile(fileInner)}>
                    <View style={styles.thumbnail}>
                      {fileInner.file_mini !== '' ? (
                        <Image
                          source={{ uri: fileInner.file_mini }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.thumbnailExt}>{fileInner.ext}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
            <TouchableHighlight
              style={styles.editBtn}
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={() => onOpenEditModal('edit', item)}
            >
              <Image source={require('../../../../assets/images/edit_2.png')} />
            </TouchableHighlight>
          </View>
        ))
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Файлы не загружены</Text>
        </View>
      )}

      {/* Modals */}
      <FileEditModal
        visible={editModalVisible}
        autoNumber={autoNumber}
        fileItem={fileItem}
        onChangeDescription={onChangeDescription}
        onUploadFile={onUploadFile}
        onDeleteFilePress={onDeleteFilePress}
        onClose={onCloseEditModal}
      />
      <FileDeleteModal
        visible={deleteModalVisible}
        onConfirm={onDeleteFile}
        onCancel={onCancelDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  addBtn: {
    paddingLeft: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: { fontSize: 20, color: '#3A3A3A' },
  fileGroup: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  fileGroupContent: {
    flex: 1,
    flexDirection: 'column',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  thumbnailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: { width: 44, height: 44, borderRadius: 5 },
  thumbnailExt: { fontSize: 13, color: '#2B2D33' },
  editBtn: {
    padding: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emptyWrap: { padding: 24 },
  emptyText: { fontSize: 15, color: '#999' },
});
