/**
 * Web-only version of AutoDetailScreen.
 * Key differences from native:
 *  - Functional component (native is class-based)
 *  - Broken into sub-components per tab (see ./web/)
 *  - No SafeAreaView, StatusBar, ScreenHeader
 *  - HTML <input> for STS and file upload
 *  - window.open for file download (replaces RNFS)
 *  - Responsive tab bar via useWebLayout
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWebLayout } from '../../hooks/useWebLayout';
import { useAutoDetail } from './web/useAutoDetail';
import { TabBar } from './web/TabBar';
import { PassesTab } from './web/PassesTab';
import { FinesTab } from './web/FinesTab';
import { AvtodorTab } from './web/AvtodorTab';
import { OsagoTab } from './web/OsagoTab';
import { DiagnosticCardTab } from './web/DiagnosticCardTab';
import { RnisTab } from './web/RnisTab';
import { FilesTab } from './web/FilesTab';
import { DriversTab } from './web/DriversTab';

export default function AutoDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDesktop } = useWebLayout();

  const autoData = useMemo(() => {
    try {
      return params.auto_data ? JSON.parse(params.auto_data as string) : null;
    } catch {
      return null;
    }
  }, [params.auto_data]);

  const d = useAutoDetail(autoData);

  if (!autoData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Данные автомобиля не найдены</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Вернуться к списку</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stsInputStyle: React.CSSProperties = {
    height: 48,
    paddingLeft: 16,
    fontSize: 18,
    backgroundColor: d.sts.length === 10 ? '#FFFFFF' : '#F9FAF9',
    border: '1px solid #656565',
    borderRadius: 8,
    color: '#313131',
    outline: 'none',
    fontFamily: 'inherit',
    maxWidth: 300,
    width: '100%',
  };

  const renderTabContent = () => {
    switch (d.currentTab) {
      case 'passes':
        return (
          <PassesTab
            loading={d.passesLoading}
            data={d.passesData}
            onOrderPass={() => {
              router.push({
                pathname: '/(authenticated)/pass' as any,
                params: { auto_list: JSON.stringify([{ ...autoData, marked: true }]) },
              });
            }}
          />
        );

      case 'fines':
        return (
          <FinesTab
            loading={d.finesLoading}
            data={d.finesData}
            paidHidden={d.finesPaidHidden}
            unpaidHidden={d.finesUnpaidHidden}
            unpaidSum={d.unpaidFinesSum}
            autoData={autoData}
            onTogglePaid={() => d.setFinesPaidHidden(v => !v)}
            onToggleUnpaid={() => d.setFinesUnpaidHidden(v => !v)}
          />
        );

      case 'avtodor':
        return (
          <AvtodorTab
            loading={d.avtodorLoading}
            data={d.avtodorData}
            paidHidden={d.avtodorPaidHidden}
            unpaidHidden={d.avtodorUnpaidHidden}
            unpaidSum={d.unpaidAvtodorSum}
            onTogglePaid={() => d.setAvtodorPaidHidden(v => !v)}
            onToggleUnpaid={() => d.setAvtodorUnpaidHidden(v => !v)}
          />
        );

      case 'osago':
        return (
          <OsagoTab
            loading={d.osagoLoading}
            data={d.osagoData}
            autoData={autoData}
            onOrderPolicy={d.orderOsagoPolicy}
          />
        );

      case 'diagnostic_card':
        return (
          <DiagnosticCardTab
            loading={d.diagnosticCardLoading}
            data={d.diagnosticCardData}
          />
        );

      case 'rnis':
        return (
          <RnisTab
            loading={d.rnisLoading}
            data={d.rnisData}
          />
        );

      case 'files':
        return (
          <FilesTab
            loading={d.filesLoading}
            filesData={d.filesData}
            fileItem={d.fileItem}
            autoNumber={autoData.auto_number}
            editModalVisible={d.editFileModalVisible}
            deleteModalVisible={d.deleteFileModalVisible}
            onOpenEditModal={d.openEditFileModal}
            onCloseEditModal={d.closeEditFileModal}
            onChangeDescription={d.changeFileDescription}
            onUploadFile={d.uploadFile}
            onDeleteFile={d.deleteFile}
            onDeleteFilePress={(item: any) => {
              d.setFileDataItem(item);
              d.setDeleteFileModalVisible(true);
            }}
            onCancelDelete={() => {
              d.setDeleteFileModalVisible(false);
              d.setFileDataItem({ id: '', file: '' });
            }}
            onDownloadFile={d.downloadFile}
          />
        );

      case 'driver':
        return <DriversTab />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{autoData.auto_number}</Text>
      </View>

      {/* STS input */}
      <View style={[styles.stsRow, isDesktop && styles.stsRowDesktop]}>
        <Text style={styles.stsLabel}>Свидетельство о регистрации ТС:</Text>
        <input
          type="text"
          maxLength={10}
          value={d.sts}
          onChange={(e: any) => d.changeSts(e.target.value)}
          style={stsInputStyle}
          placeholder="Введите номер СТС"
        />
      </View>

      {/* Tab bar */}
      <TabBar currentTab={d.currentTab} onTabChange={d.setTab} isDesktop={isDesktop} />

      {/* Tab content */}
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 60,
  },
  backLink: {
    fontSize: 16,
    color: '#3A3A3A',
    textAlign: 'center',
    marginTop: 16,
    textDecorationLine: 'underline',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 22,
    color: '#3A3A3A',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // STS
  stsRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  stsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stsLabel: {
    fontSize: 13,
    color: '#313131',
    marginBottom: 8,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
});
