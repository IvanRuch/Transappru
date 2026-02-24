import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/common';

export default function FinePaymentWebViewWebRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);

  const paymentUrl = params.payment_url as string;
  const fineData = params.fine_data as string;

  if (!paymentUrl) {
    return (
      <SafeAreaView style={styles.container}>
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

  const handleBackPress = () => {
    if (typeof window !== 'undefined' && window.confirm('Отменить оплату?')) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Оплата штрафа"
        onBack={handleBackPress}
      />
      <View style={styles.iframeContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3A3A3A" />
            <Text style={styles.loadingText}>Загрузка платёжной страницы...</Text>
          </View>
        )}
        <iframe
          ref={iframeRef}
          src={paymentUrl}
          onLoad={() => setLoading(false)}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="payment"
        />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  iframeContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
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
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#656565',
  },
});
