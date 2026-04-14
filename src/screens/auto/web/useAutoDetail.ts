import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../../services/api';

export type TabKey =
  | 'passes' | 'fines' | 'avtodor' | 'osago'
  | 'diagnostic_card' | 'rnis' | 'files' | 'driver';

export function useAutoDetail(autoData: any) {
  const router = useRouter();

  // Current tab
  const [currentTab, setCurrentTab] = useState<TabKey>('passes');

  // STS
  const [sts, setSts] = useState(autoData?.sts || '');

  // Passes
  const [passesLoading, setPassesLoading] = useState(false);
  const [passesData, setPassesData] = useState<any[]>([]);

  // Fines
  const [finesLoading, setFinesLoading] = useState(false);
  const [finesData, setFinesData] = useState<{ paid_list: any[]; unpaid_list: any[] }>({ paid_list: [], unpaid_list: [] });
  const [finesPaidHidden, setFinesPaidHidden] = useState(false);
  const [finesUnpaidHidden, setFinesUnpaidHidden] = useState(true);

  // Avtodor
  const [avtodorLoading, setAvtodorLoading] = useState(false);
  const [avtodorData, setAvtodorData] = useState<{ paid_list: any[]; unpaid_list: any[] }>({ paid_list: [], unpaid_list: [] });
  const [avtodorPaidHidden, setAvtodorPaidHidden] = useState(false);
  const [avtodorUnpaidHidden, setAvtodorUnpaidHidden] = useState(true);

  // Osago
  const [osagoLoading, setOsagoLoading] = useState(false);
  const [osagoData, setOsagoData] = useState<any>({});

  // Diagnostic card
  const [diagnosticCardLoading, setDiagnosticCardLoading] = useState(false);
  const [diagnosticCardData, setDiagnosticCardData] = useState<any>({});

  // RNIS
  const [rnisLoading, setRnisLoading] = useState(false);
  const [rnisData, setRnisData] = useState<any>({});

  // Files
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesData, setFilesData] = useState<any[]>([]);
  const [fileItem, setFileItem] = useState<any>({ id: '', description: '', file_data: [] });
  const [fileDataItem, setFileDataItem] = useState<any>({ id: '', file: '' });
  const [editFileModalVisible, setEditFileModalVisible] = useState(false);
  const [editFileMode, setEditFileMode] = useState('');
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false);

  // Track which tabs have been loaded to avoid redundant requests
  const loadedTabs = useRef<Set<string>>(new Set());

  const getToken = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }
    return token;
  }, [router]);

  const handleAuthRequired = useCallback((data: any) => {
    if (data?.auth_required === 1) {
      router.replace('/');
      return true;
    }
    return false;
  }, [router]);

  // ── API calls ───────────────────────────────────────────────────────

  const loadPasses = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setPassesLoading(true);
    try {
      const res = await api.post('/get-auto-passes', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setPassesData(res.data.auto_passes_data || []);
    } catch (e) {
      console.log('Error loading passes:', e);
    } finally {
      setPassesLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadFines = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setFinesLoading(true);
    try {
      const res = await api.post('/get-auto-fines', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setFinesData(res.data.auto_fine_data);
    } catch (e) {
      console.log('Error loading fines:', e);
    } finally {
      setFinesLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadAvtodor = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setAvtodorLoading(true);
    try {
      const res = await api.post('/get-auto-avtodor', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setAvtodorData(res.data.auto_avtodor_data);
    } catch (e) {
      console.log('Error loading avtodor:', e);
    } finally {
      setAvtodorLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadOsago = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setOsagoLoading(true);
    try {
      const res = await api.post('/get-auto-osago', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setOsagoData(res.data.auto_osago_data);
    } catch (e) {
      console.log('Error loading osago:', e);
    } finally {
      setOsagoLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadDiagnosticCard = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setDiagnosticCardLoading(true);
    try {
      const res = await api.post('/get-auto-diagnostic-card', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setDiagnosticCardData(res.data.auto_diagnostic_card_data);
    } catch (e) {
      console.log('Error loading diagnostic card:', e);
    } finally {
      setDiagnosticCardLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadRnis = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setRnisLoading(true);
    try {
      const res = await api.post('/get-auto-check-rnis', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setRnisData(res.data.auto_rnis_data);
    } catch (e) {
      console.log('Error loading rnis:', e);
    } finally {
      setRnisLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  const loadFiles = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setFilesLoading(true);
    try {
      const res = await api.post('/get-auto-files', { token, id: autoData.id });
      if (handleAuthRequired(res.data)) return;
      setFilesData(res.data.auto_file_data);
    } catch (e) {
      console.log('Error loading files:', e);
    } finally {
      setFilesLoading(false);
    }
  }, [autoData?.id, getToken, handleAuthRequired]);

  // ── Tab switching with lazy-load ────────────────────────────────────

  const setTab = useCallback((tab: TabKey) => {
    setCurrentTab(tab);

    const loaderMap: Record<string, () => Promise<void>> = {
      passes: loadPasses,
      fines: loadFines,
      avtodor: loadAvtodor,
      osago: loadOsago,
      diagnostic_card: loadDiagnosticCard,
      rnis: loadRnis,
      files: loadFiles,
    };

    if (!loadedTabs.current.has(tab) && loaderMap[tab]) {
      loadedTabs.current.add(tab);
      loaderMap[tab]();
    }
  }, [router, loadPasses, loadFines, loadAvtodor, loadOsago, loadDiagnosticCard, loadRnis, loadFiles]);

  // ── STS ─────────────────────────────────────────────────────────────

  const changeSts = useCallback((value: string) => {
    if (!value.match(/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i)) return;
    setSts(value);
    if (value.length === 10) {
      getToken().then(token => {
        if (!token) return;
        api.post('/save-sts', { token, id: autoData.id, sts: value }).catch(console.log);
      });
    }
  }, [autoData?.id, getToken]);

  // ── OSAGO order ─────────────────────────────────────────────────────

  const orderOsagoPolicy = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      await api.post('/order-osago-policy', { token, id: autoData.id });
      window.alert('Ваша заявка на оформление полиса ОСАГО принята. Мы свяжемся с вами в ближайшее время.');
    } catch {
      window.alert('Не удалось отправить заявку. Попробуйте позже.');
    }
  }, [autoData?.id, getToken]);

  // ── File operations ─────────────────────────────────────────────────

  const openEditFileModal = useCallback((mode: string, item?: any) => {
    if (mode === 'add') {
      setEditFileMode(mode);
      setEditFileModalVisible(true);
    } else {
      setFileItem({ id: item.id, description: item.description, file_data: item.file_data });
      setEditFileMode(mode);
      setEditFileModalVisible(true);
    }
  }, []);

  const closeEditFileModal = useCallback(() => {
    setEditFileModalVisible(false);
    setFileItem({ id: '', description: '', file_data: [] });
  }, []);

  const changeFileDescription = useCallback((value: string) => {
    setFileItem((prev: any) => ({ ...prev, description: value }));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const token = await getToken();
    if (!token) return;
    const formData = new FormData();
    formData.append('token', token);
    formData.append('id', autoData.id);
    formData.append('auto_file_group', fileItem.id);
    formData.append('description', fileItem.description);
    formData.append('file0', file);
    try {
      const res = await api.post('/upload-auto-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: undefined,
      });
      if (handleAuthRequired(res.data)) return;
      const newItem = res.data.auto_file_item;
      setFileItem(newItem);
      setFilesData(prev => {
        const updated = prev.map(f => f.id === newItem.id ? newItem : f);
        if (!prev.find(f => f.id === newItem.id)) updated.push(newItem);
        return updated;
      });
    } catch (e) {
      console.log('Error uploading file:', e);
    }
  }, [autoData?.id, fileItem.id, fileItem.description, getToken, handleAuthRequired]);

  const deleteFile = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await api.post('/del-auto-file', { token, id: fileDataItem.id, file: fileDataItem.file });
      if (handleAuthRequired(res.data)) return;
      const data = res.data;

      const newFileData = fileItem.file_data.filter((f: any) => f.id !== fileDataItem.id);
      const updatedFileItem = { ...fileItem, file_data: newFileData };

      setFilesData(prev => {
        if (data.empty_file_group === 1) {
          return prev.filter(f => f.id !== fileItem.id);
        }
        return prev.map(f => f.id === fileItem.id ? updatedFileItem : f);
      });

      setDeleteFileModalVisible(false);
      setFileDataItem({ id: '', file: '' });

      if (data.empty_file_group === 1) {
        setEditFileModalVisible(false);
        setFileItem({ id: '', description: '', file_data: [] });
      } else {
        setFileItem(updatedFileItem);
        setEditFileMode('');
      }
    } catch (e) {
      console.log('Error deleting file:', e);
    }
  }, [fileItem, fileDataItem, getToken, handleAuthRequired]);

  const downloadFile = useCallback((item: any) => {
    if (item.request_uri) {
      window.open(item.request_uri, '_blank');
    }
  }, []);

  // ── Computed values ─────────────────────────────────────────────────

  const unpaidFinesSum = finesData.unpaid_list.reduce((sum, item) => sum + parseInt(item.sum || '0'), 0);
  const unpaidAvtodorSum = avtodorData.unpaid_list.reduce((sum, item) => sum + parseInt(item.price || '0'), 0);

  // ── Initial load ────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoData?.id) return;
    loadedTabs.current.add('passes');
    loadPasses();
  }, [autoData?.id, loadPasses]);

  return {
    currentTab,
    setTab,

    sts,
    changeSts,

    passesLoading,
    passesData,

    finesLoading,
    finesData,
    finesPaidHidden,
    setFinesPaidHidden,
    finesUnpaidHidden,
    setFinesUnpaidHidden,
    unpaidFinesSum,

    avtodorLoading,
    avtodorData,
    avtodorPaidHidden,
    setAvtodorPaidHidden,
    avtodorUnpaidHidden,
    setAvtodorUnpaidHidden,
    unpaidAvtodorSum,

    osagoLoading,
    osagoData,
    orderOsagoPolicy,

    diagnosticCardLoading,
    diagnosticCardData,

    rnisLoading,
    rnisData,

    filesLoading,
    filesData,
    fileItem,
    fileDataItem,
    setFileDataItem,
    editFileModalVisible,
    editFileMode,
    deleteFileModalVisible,
    setDeleteFileModalVisible,
    openEditFileModal,
    closeEditFileModal,
    changeFileDescription,
    uploadFile,
    deleteFile,
    downloadFile,
  };
}
