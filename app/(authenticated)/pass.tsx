import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import PassScreen from '../../src/screens/pass/PassScreen';
import { getPendingMapData } from './pass-yamap';

export default function PassRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const focusListenersRef = useRef<(() => void)[]>([]);
  const propsRef = useRef<any>(null);
  
  // Парсим параметры из строки JSON
  const [currentAutoList, setCurrentAutoList] = useState(() => params.auto_list ? JSON.parse(params.auto_list as string) : []);
  const [currentAddressMapData, setCurrentAddressMapData] = useState(() => params.address_map_data ? JSON.parse(params.address_map_data as string) : undefined);
  const [currentLon, setCurrentLon] = useState(params.lon as string || '');
  const [currentLat, setCurrentLat] = useState(params.lat as string || '');
  
  // Sync URL params → state when returning from map screen (web: address_map_data in URL)
  useEffect(() => {
    if (params.address_map_data) {
      try {
        const parsed = JSON.parse(params.address_map_data as string);
        setCurrentAddressMapData(parsed);
        if (parsed?.lon) setCurrentLon(String(parsed.lon));
        if (parsed?.lat) setCurrentLat(String(parsed.lat));
      } catch { /* ignore */ }
    }
    if (params.auto_list) {
      try { setCurrentAutoList(JSON.parse(params.auto_list as string)); } catch { /* ignore */ }
    }
  }, [params.address_map_data, params.auto_list]);

  // Вызываем focus listeners когда экран получает фокус
  useFocusEffect(
    React.useCallback(() => {
      // Проверяем есть ли данные с карты (mobile: getPendingMapData)
      const mapData = getPendingMapData();
      if (mapData) {
        // Обновляем props напрямую для немедленного эффекта
        if (propsRef.current) {
          propsRef.current.route.params.address_map_data = mapData.address_map_data;
          propsRef.current.route.params.auto_list = mapData.auto_list;
        }
        // Обновляем state для следующего рендера
        setCurrentAddressMapData(mapData.address_map_data);
        setCurrentAutoList(mapData.auto_list);
        // Обновляем координаты
        if (mapData.address_map_data?.lon) setCurrentLon(mapData.address_map_data.lon);
        if (mapData.address_map_data?.lat) setCurrentLat(mapData.address_map_data.lat);
      }
      focusListenersRef.current.forEach(listener => listener());
    }, [])
  );
  
  // Создаем props для класс-компонента
  const props = {
    route: {
      params: {
        auto_list: currentAutoList,
        address_map_data: currentAddressMapData
      }
    },
    navigation: {
      navigate: (screen: string, params?: any) => {
        if (screen === 'AutoList') {
          router.push('/(authenticated)/auto-list' as any);
        } else if (screen === 'Auth') {
          router.replace('/');
        } else if (screen === 'PassYaMap') {
          router.push({
            pathname: '/(authenticated)/pass-yamap' as any,
            params: {
              auto_list: JSON.stringify(params.auto_list || currentAutoList),
              location_type: params.location_type || '',
              lon: params.lon || currentLon || '',
              lat: params.lat || currentLat || '',
              address: params.address || ''
            }
          });
        }
      },
      goBack: () => router.back(),
      addListener: (event: string, callback: () => void) => {
        if (event === 'focus') {
          focusListenersRef.current.push(callback);
          return () => {
            focusListenersRef.current = focusListenersRef.current.filter(cb => cb !== callback);
          };
        }
        return () => {};
      }
    }
  };
  
  // Сохраняем ссылку на props
  propsRef.current = props;
  
  return <PassScreen {...props} />;
}
