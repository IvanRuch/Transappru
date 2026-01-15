import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '../../components/common';
import PaymentService from '../../services/payment';

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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Новое состояние для скрытия WebView
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const paymentUrl = params.payment_url as string;
  const paymentId = params.payment_id as string;
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

    if (url.includes('transapp.ru/payment')) {
        // Скрываем WebView и останавливаем загрузку
        setIsRedirecting(true);
        webViewRef.current?.stopLoading();
        
        if (url.includes('/success')) {
            handlePaymentSuccess();
        } else if (url.includes('/fail')) {
            handlePaymentCancel();
        } else if (url.includes('/result')) {
            checkPaymentStatus();
        }
        return;
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId || checkingStatus) return;

    setCheckingStatus(true);

    try {
        const statusData = await PaymentService.getPaymentStatus(paymentId);
        console.log('Payment status:', statusData);

        if (statusData.status === 'auth') {
            handlePaymentSuccess();
        } else {
            Alert.alert(
                'Оплата не завершена',
                'Мы пока не получили подтверждение оплаты. Если вы оплатили, статус обновится в ближайшее время.',
                [
                    { 
                        text: 'Вернуться', 
                        onPress: () => router.back(),
                        style: 'cancel'
                    },
                    {
                        text: 'Проверить снова',
                        onPress: () => {
                            setTimeout(() => {
                                // Сбрасываем флаг, чтобы разрешить повторную проверку
                                setCheckingStatus(false);
                                checkPaymentStatus();
                            }, 500);
                        }
                    }
                ]
            );
        }
    } catch (error) {
        console.error('Error checking status:', error);
        Alert.alert('Ошибка', 'Не удалось проверить статус платежа');
        setCheckingStatus(false); // Сбрасываем только при ошибке
    } finally {
        // Не сбрасываем checkingStatus здесь, чтобы оверлей оставался, если мы показываем Alert
        // Сброс происходит внутри onPress "Проверить снова" или при уходе с экрана
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

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current && !isRedirecting) {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader 
        title="Оплата штрафа"
        onBack={handleBackPress}
      />

      <View style={styles.webviewContainer}>
        {/* Скрываем WebView, если идет редирект */}
        <View style={[styles.webviewWrapper, isRedirecting && styles.hidden]}>
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
                    // Игнорируем ошибку загрузки нашего редиректа
                    if (!nativeEvent.url.includes('transapp.ru')) {
                        console.error('WebView error:', nativeEvent);
                    }
                }}
            />
        </View>
        
        {(loading || checkingStatus || isRedirecting) && (
            <View style={[styles.loadingContainer, (checkingStatus || isRedirecting) && styles.checkingOverlay]}>
                <ActivityIndicator size="large" color="#3A3A3A" />
                <Text style={styles.loadingText}>
                    {checkingStatus || isRedirecting ? 'Проверка статуса платежа...' : 'Загрузка платёжной страницы...'}
                </Text>
            </View>
        )}
      </View>

      {__DEV__ && currentUrl && (
        <View style={styles.debugBar}>
          <Text style={styles.debugText} numberOfLines={2}>
            Current URL: {currentUrl}
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
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webviewWrapper: {
    flex: 1,
  },
  hidden: {
    display: 'none', // Скрываем WebView полностью
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
  checkingOverlay: {
    backgroundColor: '#FFFFFF', // Непрозрачный фон, чтобы скрыть WebView
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
    padding: 15,
    zIndex: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});
