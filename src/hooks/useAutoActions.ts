import { useState, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Api from '../utils/Api';
import type { AutoItem } from '../types/auto';

export function useAutoActions(
  refreshAutoList: () => Promise<void>,
  invalidateCache?: () => void
) {
  const router = useRouter();
  
  // Modals state
  const [modalViewContacts, setModalViewContacts] = useState(false);
  const [modalDelAutoVisible, setModalDelAutoVisible] = useState(false);
  const [modalAddAutoVisible, setModalAddAutoVisible] = useState(false);
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
    const emailStr = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(emailStr);
  }, []);

  const contactPhone = useCallback((phone: string) => {
    console.log('contactPhone. phone = ' + phone);
    const phoneStr = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
    Linking.openURL(phoneStr);
  }, []);

  const contactWhatsapp = useCallback((phone: string, greetings: string) => {
    console.log('contactWhatsapp. phone = ' + phone);
    const whatsappStr = `whatsapp://send?phone=${phone}&text=${greetings}`;
    Linking.openURL(whatsappStr);
  }, []);

  const openContacts = useCallback(() => {
    setModalViewContacts(true);
  }, []);

  // Navigation
  const navigateToAutoDriver = useCallback((markedAutos: AutoItem[]) => {
    console.log('-> move to AutoDriver');
    // TODO: Создать экран AutoDriver
    // router.push({
    //   pathname: '/(authenticated)/auto-driver',
    //   params: { auto_list: JSON.stringify(markedAutos) }
    // });
  }, [router]);

  const navigateToPass = useCallback((markedAutos: AutoItem[]) => {
    console.log('-> move to Pass');
    // TODO: Создать экран Pass
    // router.push({
    //   pathname: '/(authenticated)/pass',
    //   params: { auto_list: JSON.stringify(markedAutos) }
    // });
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
    // TODO: Создать экран Services
    // router.push('/(authenticated)/services');
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

  // Delete auto
  const deleteAuto = useCallback(async (token: string | null) => {
    if (!token) {
      console.log('empty token');
      router.replace('/');
      return;
    }

    try {
      const res = await Api.post('/del-auto', { token });
      const data = res.data;
      console.log('deleteAuto response:', data);

      setModalDelAutoVisible(false);
      
      // Инвалидируем кэш после удаления авто
      if (invalidateCache) {
        invalidateCache();
      }
      
      await refreshAutoList();
    } catch (error: any) {
      console.log('error in deleteAuto:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  }, [refreshAutoList, invalidateCache, router]);

  // Add auto - валидация
  const changeAutoNumberBase = useCallback((value: string) => {
    setAutoNumberBase(value);
    const isValid = value.match(/^[АВЕКМНОРСТУХ]{1}[0-9]{3}[АВЕКМНОРСТУХ]{2}$/i);
    setAutoNumberBaseOk(!!isValid);
    checkAddAutoEnabled(!!isValid, autoNumberRegionCodeOk, stsOk);
  }, [autoNumberRegionCodeOk, stsOk]);

  const changeAutoNumberRegionCode = useCallback((value: string) => {
    setAutoNumberRegionCode(value);
    const isValid = value.match(/^[0-9]{2,3}$/);
    setAutoNumberRegionCodeOk(!!isValid);
    checkAddAutoEnabled(autoNumberBaseOk, !!isValid, stsOk);
  }, [autoNumberBaseOk, stsOk]);

  const changeSts = useCallback((value: string) => {
    setSts(value);
    const isValid = value.match(/^[0-9]{2}[ ]{0,1}[А-Я]{2}[ ]{0,1}[0-9]{6}$/i);
    setStsOk(!!isValid);
    checkAddAutoEnabled(autoNumberBaseOk, autoNumberRegionCodeOk, !!isValid);
  }, [autoNumberBaseOk, autoNumberRegionCodeOk]);

  const checkAddAutoEnabled = useCallback((baseOk: boolean, regionOk: boolean, stsValid: boolean) => {
    setModalAddAutoButtonDisabled(!(baseOk && regionOk && stsValid));
  }, []);

  // Add auto - submit
  const addAuto = useCallback(async (token: string | null) => {
    if (!token) {
      console.log('empty token');
      router.replace('/');
      return;
    }

    const autoNumber = autoNumberBase + autoNumberRegionCode;

    try {
      const res = await Api.post('/add-auto', { 
        token, 
        auto_number: autoNumber, 
        sts 
      });
      const data = res.data;
      console.log('addAuto response:', data);

      modalAddAutoCancel();
      
      // Инвалидируем кэш после добавления авто
      if (invalidateCache) {
        invalidateCache();
      }
      
      await refreshAutoList();
    } catch (error: any) {
      console.log('error in addAuto:', error);
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
    navigateToAutoDriver,
    navigateToPass,
    navigateToAuto,
    navigateToProfile,
    navigateToServices,
    navigateToOnBoarding,
    navigateToDriverList,
    navigateToInn,
    deleteAuto,
    changeAutoNumberBase,
    changeAutoNumberRegionCode,
    changeSts,
    addAuto,
    modalAddAutoCancel,
  };
}
