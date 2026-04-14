/**
 * Web version of FinePaymentSuccessScreen.
 * Displays success message after payment completion.
 * Navigation: back to auto-list or to fine details.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WebAppLayout from '../../components/web/WebAppLayout';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

export default function FinePaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData = useMemo(() => {
    try {
      return params.fine_data ? JSON.parse(params.fine_data as string) : null;
    } catch {
      return null;
    }
  }, [params.fine_data]);

  return (
    <WebAppLayout>
      <View style={s.container}>
        <View style={s.card}>
          <Text style={s.checkmark}>✓</Text>
          <Text style={[s.title, noSelect]}>Оплата прошла успешно</Text>
          <Text style={[s.subtitle, noSelect]}>
            Статус штрафа обновится в ближайшее время
          </Text>

          {fineData && (
            <View style={s.details}>
              <Text style={[s.detailText, noSelect]}>
                Постановление от {fineData.dat}
              </Text>
              <Text style={[s.detailAmount, noSelect]}>
                {fineData.sum} ₽
              </Text>
            </View>
          )}

          <View style={s.actions}>
            <Pressable
              style={s.primaryBtn}
              onPress={() => router.replace('/(authenticated)/auto-list' as any)}
            >
              <Text style={[s.primaryBtnText, noSelect]}>Вернуться к списку</Text>
            </Pressable>

            {fineData && (
              <Pressable
                style={s.secondaryBtn}
                onPress={() =>
                  router.replace({
                    pathname: '/(authenticated)/auto-fine' as any,
                    params: { fine_data: JSON.stringify(fineData) },
                  })
                }
              >
                <Text style={[s.secondaryBtnText, noSelect]}>К деталям штрафа</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
  },
  checkmark: {
    fontSize: 48,
    color: '#4CAF50',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  details: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailText: { fontSize: 14, color: '#656565' },
  detailAmount: { fontSize: 20, fontWeight: '700', color: '#313131', marginTop: 4 },
  actions: { width: '100%', gap: 10 },
  primaryBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  secondaryBtnText: { color: '#313131', fontSize: 16 },
});
