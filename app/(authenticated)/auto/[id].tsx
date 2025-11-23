import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AutoDetailScreen from '../../../src/screens/auto/AutoDetailScreen';

export default function AutoDetailRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Парсим auto_data из строки JSON
  const autoData = params.auto_data ? JSON.parse(params.auto_data as string) : null;
  
  // Создаем props для класс-компонента
  const props = {
    route: {
      params: {
        auto_data: autoData
      }
    },
    navigation: {
      navigate: (screen: string, params?: any) => {
        if (screen === 'AutoList') {
          router.back();
        } else if (screen === 'Auth') {
          router.replace('/');
        } else if (screen === 'DriverList') {
          router.push('/(authenticated)/drivers' as any);
        } else if (screen === 'AutoFine') {
          router.push({
            pathname: '/(authenticated)/auto-fine' as any,
            params: {
              fine_data: JSON.stringify(params.fine_data)
            }
          });
        } else if (screen === 'Pass') {
          router.push({
            pathname: '/(authenticated)/pass' as any,
            params: {
              auto_list: JSON.stringify(params.auto_list),
              address_map_data: params.address_map_data ? JSON.stringify(params.address_map_data) : undefined
            }
          });
        }
      }
    }
  };
  
  return <AutoDetailScreen {...props} />;
}
