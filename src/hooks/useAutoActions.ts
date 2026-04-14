import { useState, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import type { AutoItem } from '../types/auto';

// Russian license plates use only these 12 Cyrillic letters (matching Latin lookalikes)
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н',
  O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х',
};

const GRZ_ALLOWED = /^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i;
const DIGITS_ONLY = /^[0-9]*$/;

function normalizePlate(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .map(ch => LATIN_TO_CYRILLIC[ch] || ch)
    .join('');
}

export function useAutoActions(
  refreshAutoList: () => Promise<void>,
  invalidateCache?: () => void
) {
  const router = useRouter();
  
  // Modals state
  const [modalViewContacts, setModalViewContacts] = useState(false);
  const [modalDelAutoVisible, setModalDelAutoVisible] = useState(false);
  const [modalAddAutoVisible, setModalAddAutoVisible] = useState(false);
  const [modalDebtInfoVisible, setModalDebtInfoVisible] = useState(false);
  const [findAutoVisible, setFindAutoVisible] = useState(false);
  const [menuLeftVisible, setMenuLeftVisible] = useState(false);
  
  // Add auto state
  const [autoNumberBase, setAutoNumberBase] = useState('');
  const [autoNumberBaseOk, setAutoNumberBaseOk] = useState(false);
  const [autoNumberRegionCode, setAutoNumberRegionCode] = useState('');
  const [autoNumberRegionCodeOk, setAutoNumberRegionCodeOk] = useState(false);
  const [sts, setSts] = useState('');
  const [stsOk, setStsOk] = useState(false);
  const [stsByAutoNumberIndicator, setStsByAutoNumberIndicator] = useState(false);
  const [modalAddAutoButtonDisabled, setModalAddAutoButtonDisabled] = useState(true);
  
  // Contact methods
  const contactEmail = useCallback((email: string, subject: string, body: string) => {
    console.log('contactEmail. email = ' + email);
    const emailStr = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(emailStr).catch(err => {
      console.log('Error opening email:', err);
    });
  }, []);

  const contactPhone = useCallback((phone: string) => {
    console.log('contactPhone. phone = ' + phone);
    
    // Проверяем что номер телефона валидный (не пустой и не только +7)
    if (!phone || phone === '+7' || phone.length < 5) {
      console.log('Invalid phone number:', phone);
      return;
    }
    
    // telprompt: для iOS (показывает диалог подтверждения), tel: для Android
    // Примечание: telprompt: не работает в iOS симуляторе, но работает на реальном устройстве
    const phoneStr = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
    Linking.openURL(phoneStr).catch(err => {
      console.log('Error opening phone:', err);
    });
  }, []);

  const contactWhatsapp = useCallback((phone: string, greetings: string) => {
    console.log('contactWhatsapp. phone = ' + phone);
    
    // Проверяем что номер телефона валидный
    if (!phone || phone === '+7' || phone.length < 5) {
      console.log('Invalid phone number for WhatsApp:', phone);
      return;
    }
    
    const whatsappStr = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(greetings)}`;
    Linking.openURL(whatsappStr).catch(err => {
      console.log('Error opening WhatsApp:', err);
    });
  }, []);

  const openContacts = useCallback(() => {
    setModalViewContacts(true);
  }, []);

  const switchOrganization = useCallback(async (inn: string, onSuccess?: () => void, onFinally?: () => void) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/' as any);
        return;
      }

      console.log('Switching to organization with INN:', inn);

      const res = await api.post('/set-current-inn', {
        token,
        current_inn: inn,
      });

      const data = res.data;
      console.log('Switch organization response:', data);

      if (data.auth_required === 1) {
        console.log('⚠️ Organization switch failed: auth_required.');
        // Удаляем токен и делаем редирект на авторизацию
        await AsyncStorage.removeItem('token');
        router.replace('/' as any);
        return;
      }

      // Вызываем callback для перезагрузки данных
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.log('Error switching organization:', error);
      if (error.response?.status === 401) {
        // Только при 401 делаем редирект на авторизацию
        await AsyncStorage.removeItem('token');
        router.replace('/' as any);
      } else {
        // Для других ошибок показываем сообщение
        alert('Ошибка при переключении организации. Попробуйте позже.');
      }
    } finally {
      if (onFinally) {
        onFinally();
      }
    }
  }, [router]);

  // Navigation
  const navigateToAutoDriver = useCallback((markedAutos: AutoItem[]) => {
    console.log('-> move to AutoDriver');
    router.push({
      pathname: '/(authenticated)/auto-driver' as any,
      params: { auto_list: JSON.stringify(markedAutos) }
    });
  }, [router]);

  const navigateToPass = useCallback((markedAutos: AutoItem[]) => {
    console.log('-> move to Pass');
    router.push({
      pathname: '/(authenticated)/pass',
      params: { auto_list: JSON.stringify(markedAutos) }
    });
  }, [router]);

  const navigateToAuto = useCallback((autoData: AutoItem) => {
    console.log('-> move to Auto', autoData);
    router.push({
      pathname: `/(authenticated)/auto/${autoData.id}` as any,
      params: { auto_data: JSON.stringify(autoData) }
    });
  }, [router]);

  const navigateToProfile = useCallback(() => {
    console.log('-> move to User');
    router.push('/user' as any);
  }, [router]);

  const navigateToServices = useCallback(() => {
    console.log('-> move to OurServices');
    router.push('/(authenticated)/services');
  }, [router]);

  const navigateToOnBoarding = useCallback(() => {
    console.log('-> move to OnBoarding');
    router.push('/onboarding');
  }, [router]);

  const navigateToDriverList = useCallback(() => {
    console.log('-> move to DriverList');
    router.push('/(authenticated)/drivers' as any);
  }, [router]);

  const navigateToInn = useCallback((userData: any, checkRnis: boolean) => {
    console.log('-> move to Inn', { userData, checkRnis });
    router.push({
      pathname: '/(authenticated)/inn' as any,
      params: {
        user_data: JSON.stringify(userData),
        check_rnis: checkRnis ? '1' : '0'
      }
    });
  }, [router]);

  const navigateToCharges = useCallback(() => {
    console.log('-> move to Charges');
    router.push('/(authenticated)/charges' as any);
  }, [router]);

  // Delete auto
  const deleteAuto = useCallback(async (token: string | null, autoListToDelete: string[]) => {
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      console.log('Deleting autos:', autoListToDelete);
      console.log('Sending to API - ids:', autoListToDelete.join(','));
      const res = await api.post('/del-auto', {
        token,
        ids: autoListToDelete.join(',')
      });
      const data = res.data;
      console.log('deleteAuto response:', data);
      console.log('Deleted successfully, res:', data.res);

      // Проверка auth_required
      if (data.auth_required === 1) {
        console.log('Auth required, redirecting to auth');
        router.replace('/');
        return;
      }

      setModalDelAutoVisible(false);
      
      // Инвалидируем кэш и обновляем список
      if (invalidateCache) {
        console.log('Invalidating cache after delete...');
        invalidateCache();
      }
      
      // Обновляем список сразу, не дожидаясь ответа сервера
      console.log('Refreshing auto list after delete...');
      await refreshAutoList();
      console.log('Auto list refreshed after delete');
    } catch (error: any) {
      console.log('error in deleteAuto:', error);
      console.log('error response:', error.response);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  }, [refreshAutoList, invalidateCache, router]);

  // Add auto - валидация
  const checkAddAutoEnabled = useCallback((baseOk: boolean, regionOk: boolean, stsValid: boolean) => {
    setModalAddAutoButtonDisabled(!(baseOk && regionOk && stsValid));
  }, []);

  const changeAutoNumberBase = useCallback((value: string) => {
    const converted = normalizePlate(value);
    if (!GRZ_ALLOWED.test(converted)) return;
    const clamped = converted.substring(0, 6);
    setAutoNumberBase(clamped);
    const isValid = clamped.length === 6;
    setAutoNumberBaseOk(isValid);
    checkAddAutoEnabled(isValid, autoNumberRegionCodeOk, stsOk);
  }, [autoNumberRegionCodeOk, stsOk, checkAddAutoEnabled]);

  const changeAutoNumberRegionCode = useCallback((value: string) => {
    if (!DIGITS_ONLY.test(value)) return;
    const clamped = value.substring(0, 3);
    setAutoNumberRegionCode(clamped);
    const isValid = clamped.length >= 2 && clamped.length <= 3;
    setAutoNumberRegionCodeOk(isValid);
    checkAddAutoEnabled(autoNumberBaseOk, isValid, stsOk);
  }, [autoNumberBaseOk, stsOk, checkAddAutoEnabled]);

  const changeSts = useCallback((value: string) => {
    const converted = normalizePlate(value);
    if (!GRZ_ALLOWED.test(converted)) return;
    const clamped = converted.substring(0, 10);
    setSts(clamped);
    const isValid = clamped.length === 10;
    setStsOk(isValid);
    checkAddAutoEnabled(autoNumberBaseOk, autoNumberRegionCodeOk, isValid);
  }, [autoNumberBaseOk, autoNumberRegionCodeOk, checkAddAutoEnabled]);

  // Add auto - submit
  const addAuto = useCallback(async (token: string | null) => {
    if (!token) {
      console.log('empty token');
      router.replace('/');
      return;
    }

    try {
      const res = await api.post('/add-auto', { 
        token,
        auto_number_base: autoNumberBase,
        auto_number_region_code: autoNumberRegionCode,
        sts 
      });
      const data = res.data;
      console.log('addAuto response:', data);

      // Проверка auth_required
      if (data.auth_required === 1) {
        console.log('Auth required, redirecting to auth');
        router.replace('/');
        return;
      }

      modalAddAutoCancel();
      
      // Инвалидируем кэш после добавления авто
      if (invalidateCache) {
        console.log('Invalidating cache...');
        invalidateCache();
      }
      
      console.log('Refreshing auto list...');
      await refreshAutoList();
      console.log('Auto list refreshed');
    } catch (error: any) {
      console.log('error in addAuto:', error);
      console.log('error response:', error.response);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  }, [autoNumberBase, autoNumberRegionCode, sts, refreshAutoList, invalidateCache, router]);

  const modalAddAutoCancel = useCallback(() => {
    setAutoNumberBase('');
    setAutoNumberBaseOk(false);
    setAutoNumberRegionCode('');
    setAutoNumberRegionCodeOk(false);
    setSts('');
    setStsOk(false);
    setStsByAutoNumberIndicator(false);
    setModalAddAutoButtonDisabled(true);
    setModalAddAutoVisible(false);
  }, []);

  return {
    // State
    modalViewContacts,
    setModalViewContacts,
    modalDelAutoVisible,
    setModalDelAutoVisible,
    modalAddAutoVisible,
    setModalAddAutoVisible,
    modalDebtInfoVisible,
    setModalDebtInfoVisible,
    findAutoVisible,
    setFindAutoVisible,
    menuLeftVisible,
    setMenuLeftVisible,
    autoNumberBase,
    autoNumberBaseOk,
    autoNumberRegionCode,
    autoNumberRegionCodeOk,
    sts,
    stsOk,
    stsByAutoNumberIndicator,
    modalAddAutoButtonDisabled,
    
    // Methods
    contactEmail,
    contactPhone,
    contactWhatsapp,
    openContacts,
    switchOrganization,
    navigateToAutoDriver,
    navigateToPass,
    navigateToAuto,
    navigateToProfile,
    navigateToServices,
    navigateToOnBoarding,
    navigateToDriverList,
    navigateToInn,
    navigateToCharges,
    deleteAuto,
    changeAutoNumberBase,
    changeAutoNumberRegionCode,
    changeSts,
    addAuto,
    modalAddAutoCancel,
  };
}
