import React, { useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PassYaMapScreen from '../../src/screens/pass/PassYaMapScreen';

// Глобальное хранилище для передачи данных с карты
let pendingMapData: any = null;

export function getPendingMapData() {
  const data = pendingMapData;
  pendingMapData = null;
  return data;
}

export default function PassYaMapRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Парсим параметры из строки JSON
  const autoList = params.auto_list ? JSON.parse(params.auto_list as string) : [];
  // Используем ?? вместо || чтобы пустая строка не заменялась на 'mkad'
  const locationType = (params.location_type as string) ?? '';
  const lon = params.lon as string || '';
  const lat = params.lat as string || '';
  const address = params.address as string || '';
  
  // Создаем props для класс-компонента
  const props = {
    route: {
      params: {
        auto_list: autoList,
        location_type: locationType,
        lon: lon,
        lat: lat,
        address: address
      }
    },
    navigation: {
      navigate: (screen: string, params?: any) => {
        if (screen === 'Pass') {
          // Сохраняем данные в глобальное хранилище
          pendingMapData = {
            address_map_data: params.address_map_data,
            auto_list: params.auto_list
          };
          // Возвращаемся назад вместо navigate
          router.back();
        } else if (screen === 'Auth') {
          router.replace('/');
        }
      },
      goBack: () => router.back(),
      addListener: (event: string, callback: () => void) => {
        // Заглушка для совместимости с React Navigation
        return () => {};
      }
    }
  };
  
  return <PassYaMapScreen {...props} />;
}
