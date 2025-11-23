import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableHighlight, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '../../components/common';

interface FineData {
  is_paid: string | number;
  discount_time_left?: string;
  discount_date_end?: string;
  discount_percent?: string;
  dat: string;
  code: string;
  description: string;
  uin: string;
  sum: string;
  full_sum: string;
  vendor: string;
  comment?: string;
}

export default function FinePaymentWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);
  
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const paymentUrl = params.payment_url as string;
  const fineData: FineData = params.fine_data 
    ? JSON.parse(params.fine_data as string) 
    : null;

  if (!paymentUrl) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title="Оплата"
          onBack={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ссылка на оплату не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleNavigationStateChange = (navState: any) => {
    const { url, canGoBack: webViewCanGoBack } = navState;
    setCurrentUrl(url);
    setCanGoBack(webViewCanGoBack);

    console.log('WebView navigation:', url);

    // Проверяем URL на результаты оплаты
    // TODO: Настроить под реальные URL callback'ов платёжной системы
    if (url.includes('success') || url.includes('payment-success')) {
      console.log('Payment success detected');
      handlePaymentSuccess();
    } else if (url.includes('cancel') || url.includes('payment-cancel')) {
      console.log('Payment cancelled');
      handlePaymentCancel();
    } else if (url.includes('fail') || url.includes('error')) {
      console.log('Payment failed');
      handlePaymentError();
    }
  };

  const handlePaymentSuccess = () => {
    router.replace({
      pathname: '/(authenticated)/fine-payment-success' as any,
      params: { 
        fine_data: JSON.stringify(fineData),
        status: 'success'
      }
    });
  };

  const handlePaymentCancel = () => {
    Alert.alert(
      'Оплата отменена',
      'Вы отменили оплату штрафа',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handlePaymentError = () => {
    Alert.alert(
      'Ошибка оплаты',
      'Произошла ошибка при обработке платежа. Попробуйте снова.',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      Alert.alert(
        'Отменить оплату?',
        'Вы уверены, что хотите отменить оплату?',
        [
          {
            text: 'Нет',
            style: 'cancel'
          },
          {
            text: 'Да',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Оплата штрафа"
        onBack={handleBackPress}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3A3A3A" />
          <Text style={styles.loadingText}>Загрузка платёжной страницы...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert(
            'Ошибка загрузки',
            'Не удалось загрузить платёжную страницу',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        }}
      />

      {/* Индикатор текущего URL (для отладки) */}
      {__DEV__ && currentUrl && (
        <View style={styles.debugBar}>
          <Text style={styles.debugText} numberOfLines={1}>
            {currentUrl}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#656565',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#313131',
    textAlign: 'center',
  },
  debugBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});
