import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableHighlight, 
  ActivityIndicator, 
  ScrollView, 
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import api from '../../services/api';

interface Driver {
  id: string;
  name_f: string;
  name_i: string;
  name_o: string;
}

interface AutoItem {
  id: string;
  auto_number_base: string;
  auto_number_region_code: string;
  check_passes_string?: string;
  check_fines_string?: string;
  check_diagnostic_card_string?: string;
  check_osago_string?: string;
}

export default function AutoDriverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [indicator, setIndicator] = useState(false);
  const [userDriverList, setUserDriverList] = useState<Driver[]>([]);
  const [autoList, setAutoList] = useState<AutoItem[]>([]);

  useEffect(() => {
    console.log('AutoDriverScreen mounted');
    
    // Парсим список авто из параметров
    if (params.auto_list) {
      try {
        const parsedAutoList = JSON.parse(params.auto_list as string);
        setAutoList(parsedAutoList);
      } catch (e) {
        console.log('Error parsing auto_list:', e);
      }
    }
    
    // Загружаем список водителей
    AsyncStorage.getItem('token').then((value) => getDriverList(value));
  }, []);

  const getDriverList = async (token: string | null) => {
    console.log('getDriverList. token =', token ? 'EXISTS' : 'NULL');

    if (!token) {
      router.replace('/');
      return;
    }

    setIndicator(true);

    try {
      const res = await api.post('/get-driver-list', { token });
      const data = res.data;
      console.log('Driver list response:', data);

      if (data.auth_required === 1) {
        router.replace('/');
      } else {
        setIndicator(false);
        setUserDriverList(data.user_driver_list || []);
      }
    } catch (error: any) {
      console.log('Error getting driver list:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
      setIndicator(false);
    }
  };

  const renderDriverItem = (item: Driver, index: number) => {
    return (
      <Pressable
        key={item.id}
        style={styles.driverCard}
      >
        <View style={styles.driverIconContainer}>
          <Image source={require('../../../assets/images/driver.png')} />
        </View>
        <View style={styles.driverInfoContainer}>
          <Text style={styles.driverName}>
            {item.name_f} {item.name_i} {item.name_o}
          </Text>
        </View>
        <View style={styles.driverActionContainer}>
          {/* Placeholder for edit button */}
        </View>
      </Pressable>
    );
  };

  const renderAutoItem = (item: AutoItem) => {
    return (
      <View key={item.id} style={styles.autoCard}>
        <View style={styles.autoIconContainer}>
          <Image 
            source={require('../../../assets/images/truck.png')} 
            style={styles.autoImage}
          />
          <View style={styles.autoNumberContainer}>
            <Text style={styles.autoNumberBase}>{item.auto_number_base}</Text>
            <Image 
              source={require('../../../assets/images/line_11.png')} 
              style={styles.autoNumberDivider}
            />
            <View style={styles.autoRegionContainer}>
              <Text style={styles.autoRegionCode}>{item.auto_number_region_code}</Text>
              <View style={styles.autoFlagContainer}>
                <Text style={styles.autoFlagText}>RUS</Text>
                <Image 
                  source={require('../../../assets/images/flag_rus.png')} 
                  style={styles.autoFlagImage}
                />
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.autoInfoContainer}>
          <Text style={styles.autoInfoText}>
            Пропуск - {item.check_passes_string || 'Н/Д'}
          </Text>
          <Text style={styles.autoInfoText}>
            Штрафы - {item.check_fines_string || 'Н/Д'}
          </Text>
          <Text style={styles.autoInfoText}>
            ДК - {item.check_diagnostic_card_string || 'Н/Д'}
          </Text>
          <Text style={styles.autoInfoText}>
            ОСАГО - {item.check_osago_string || 'Н/Д'}
          </Text>
        </View>
        
        <View style={styles.autoArrowContainer}>
          <Image source={require('../../../assets/images/emojione-v1_right-arrow.png')} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableHighlight
          style={styles.headerBackButton}
          underlayColor="#f0f0f0"
          onPress={() => {
            console.log('-> back to AutoList');
            router.back();
          }}
        >
          <Image source={require('../../../assets/images/back.png')} />
        </TouchableHighlight>
        
        <Text style={styles.header}>Назначить водителя</Text>
        
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {indicator && (
          <ActivityIndicator 
            size="large" 
            color="#313131" 
            style={styles.indicator}
          />
        )}

        {/* Список водителей */}
        {!indicator && userDriverList.length > 0 && (
          <View>
            {userDriverList.map((item, index) => renderDriverItem(item, index))}
          </View>
        )}

        {!indicator && userDriverList.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет доступных водителей</Text>
            <Text style={styles.emptySubText}>
              {"Добавьте водителей в разделе \"Список водителей\""}
            </Text>
          </View>
        )}

        {/* Закрепленные автомобили */}
        {autoList.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Закрепленные автомобили:</Text>
            <View>
              {autoList.map((item) => renderAutoItem(item))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 8,
  },
  header: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  indicator: {
    marginTop: 50,
  },
  driverCard: {
    flexDirection: 'row',
    margin: 15,
    marginBottom: 5,
    padding: 15,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
  },
  driverIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfoContainer: {
    flex: 3,
    paddingLeft: 15,
    justifyContent: 'center',
  },
  driverName: {
    color: '#E8E8E8',
    fontSize: 16,
  },
  driverActionContainer: {
    width: 30,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  autoCard: {
    flexDirection: 'row',
    margin: 15,
    marginBottom: 5,
    padding: 15,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
  },
  autoIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  autoNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  autoNumberBase: {
    fontSize: 12,
    color: '#C9A86B',
  },
  autoNumberDivider: {
    marginHorizontal: 3,
    marginTop: 5,
  },
  autoRegionContainer: {
    alignItems: 'center',
  },
  autoRegionCode: {
    fontSize: 10,
    color: '#C9A86B',
  },
  autoFlagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoFlagText: {
    fontSize: 8,
    color: '#C9A86B',
  },
  autoFlagImage: {
    width: 10,
    height: 7,
    marginLeft: 2,
  },
  autoInfoContainer: {
    flex: 2,
    paddingLeft: 15,
    justifyContent: 'center',
  },
  autoInfoText: {
    color: '#E8E8E8',
    fontSize: 12,
    marginBottom: 2,
  },
  autoArrowContainer: {
    width: 30,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    fontSize: 15,
    fontWeight: 'normal',
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
