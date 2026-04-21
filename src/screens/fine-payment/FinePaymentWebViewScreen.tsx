import React, { useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '../../components/common';
import PaymentService from '../../services/payment';

interface FineData {
  uin: string;
  [key: string]: any;
}

export default function FinePaymentWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const paymentUrl = params.payment_url as string;
  const paymentId = params.payment_id as string;
  const fineData: FineData | null = params.fine_data
    ? JSON.parse(params.fine_data as string)
    : null;

  if (!paymentUrl) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ScreenHeader title="Оплата" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center p-5">
          <Text className="text-base text-text-primary text-center">Ссылка на оплату не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePaymentSuccess = () => {
    router.replace({
      pathname: '/(authenticated)/fine-payment-success' as any,
      params: { fine_data: JSON.stringify(fineData), status: 'success' },
    });
  };

  const handlePaymentCancel = () => {
    Alert.alert('Оплата отменена', 'Вы отменили оплату штрафа', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const checkPaymentStatus = async () => {
    if (!paymentId || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const statusData = await PaymentService.getPaymentStatus(paymentId);
      if (statusData.status === 'auth') {
        handlePaymentSuccess();
      } else {
        Alert.alert(
          'Оплата не завершена',
          'Мы пока не получили подтверждение оплаты. Если вы оплатили, статус обновится в ближайшее время.',
          [
            { text: 'Вернуться', onPress: () => router.back(), style: 'cancel' },
            {
              text: 'Проверить снова',
              onPress: () => setTimeout(() => {
                setCheckingStatus(false);
                checkPaymentStatus();
              }, 500),
            },
          ],
        );
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось проверить статус платежа');
      setCheckingStatus(false);
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url, canGoBack: webCanGoBack } = navState;
    setCurrentUrl(url);
    setCanGoBack(webCanGoBack);

    if (url.includes('transapp.ru/payment')) {
      setIsRedirecting(true);
      webViewRef.current?.stopLoading();
      if (url.includes('/success')) handlePaymentSuccess();
      else if (url.includes('/fail')) handlePaymentCancel();
      else if (url.includes('/result')) checkPaymentStatus();
    }
  };

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current && !isRedirecting) {
      webViewRef.current.goBack();
    } else {
      Alert.alert('Отменить оплату?', 'Вы уверены, что хотите отменить оплату?', [
        { text: 'Нет', style: 'cancel' },
        { text: 'Да', onPress: () => router.back() },
      ]);
    }
  };

  const showOverlay = loading || checkingStatus || isRedirecting;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScreenHeader title="Оплата штрафа" onBack={handleBackPress} />

      <View className="flex-1 relative">
        <View className={`flex-1 ${isRedirecting ? 'hidden' : ''}`}>
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={{ flex: 1 }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            onError={(e) => {
              if (!e.nativeEvent.url.includes('transapp.ru')) {
                console.error('WebView error:', e.nativeEvent);
              }
            }}
          />
        </View>

        {showOverlay && (
          <View className="absolute inset-0 items-center justify-center bg-white z-10">
            <ActivityIndicator size="large" color="#3A3A3A" />
            <Text className="mt-4 text-base text-text-secondary">
              {checkingStatus || isRedirecting
                ? 'Проверка статуса платежа...'
                : 'Загрузка платёжной страницы...'}
            </Text>
          </View>
        )}
      </View>

      {__DEV__ && currentUrl && (
        <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 z-10">
          <Text className="text-xs text-white" numberOfLines={2}>
            Current URL: {currentUrl}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
