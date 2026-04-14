/**
 * Web version of AutoFineScreen.
 * Display-only: fine details received via route params.
 * Payment button navigates to fine-payment-confirm.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WebAppLayout from '../../components/web/WebAppLayout';
import { SHOW_PAYMENT_UI } from '../../config/features';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

export default function AutoFineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData = useMemo(() => {
    try {
      return params.fine_data ? JSON.parse(params.fine_data as string) : null;
    } catch {
      return null;
    }
  }, [params.fine_data]);

  if (!fineData) {
    return (
      <WebAppLayout>
        <View style={s.center}>
          <Text style={s.emptyText}>Данные штрафа не найдены</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={s.backLink}>Вернуться назад</Text>
          </Pressable>
        </View>
      </WebAppLayout>
    );
  }

  const isPaid = fineData.is_paid === '1' || fineData.is_paid === 1;
  const isPlaton = fineData.is_platon === '1' || fineData.is_platon === 1;
  const hasDiscount = !isPaid && fineData.discount_time_left;
  const autoNumber = fineData._auto_number || fineData.user_auto?.auto_number || '';

  const handlePay = () => {
    router.push({
      pathname: '/(authenticated)/fine-payment-confirm' as any,
      params: { fine_data: JSON.stringify(fineData) },
    });
  };

  return (
    <WebAppLayout>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={[s.headerTitle, noSelect]}>Штраф</Text>
        {autoNumber ? <Text style={[s.headerSub, noSelect]}>{autoNumber}</Text> : null}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Status card */}
        {isPaid && (
          <View style={[s.statusCard, s.statusPaid]}>
            <Text style={s.statusIcon}>✔</Text>
            <Text style={[s.statusText, noSelect]}>Штраф погашен</Text>
          </View>
        )}
        {hasDiscount && (
          <View style={[s.statusCard, s.statusDiscount]}>
            <Text style={s.statusIcon}>🏷</Text>
            <Text style={[s.statusText, noSelect]}>
              Скидка на оплату актуальна ещё {fineData.discount_time_left}
            </Text>
          </View>
        )}

        {/* Fine details */}
        <View style={s.card}>
          <Text style={[s.cardTitle, noSelect]}>Нарушение {fineData.dat}</Text>

          <View style={s.row}>
            <Text style={[s.label, noSelect]}>Статья КОАП:</Text>
            <Text style={s.value}>{fineData.code}</Text>
          </View>

          <View style={s.descRow}>
            <Text style={s.descText}>{fineData.description}</Text>
          </View>

          {fineData.offence_place && (
            <View style={s.descRow}>
              <Text style={s.placeText}>{fineData.offence_place}</Text>
            </View>
          )}

          <View style={s.row}>
            <Text style={[s.label, noSelect]}>Номер постановления:</Text>
            <Text style={s.value}>{fineData.uin}</Text>
          </View>

          {isPlaton && (
            <View style={s.row}>
              <Text style={[s.platonBadge, noSelect]}>ПЛАТОН</Text>
            </View>
          )}

          <View style={s.divider} />

          {/* Amounts */}
          <View style={s.row}>
            <Text style={[s.label, noSelect]}>Сумма штрафа:</Text>
            <Text style={[s.amountText, noSelect]}>{fineData.sum} ₽</Text>
          </View>

          {fineData.full_sum && fineData.full_sum !== fineData.sum && (
            <View style={s.row}>
              <Text style={[s.label, noSelect]}>Полная сумма без скидки:</Text>
              <Text style={[s.fullAmountText, noSelect]}>{fineData.full_sum} ₽</Text>
            </View>
          )}

          {fineData.discount_percent && (
            <View style={s.row}>
              <Text style={[s.label, noSelect]}>Скидка:</Text>
              <Text style={[s.discountText, noSelect]}>{fineData.discount_percent}%</Text>
            </View>
          )}

          {fineData.discount_date_end && (
            <View style={s.row}>
              <Text style={[s.label, noSelect]}>Скидка действует до:</Text>
              <Text style={s.value}>{fineData.discount_date_end}</Text>
            </View>
          )}

          {fineData.vendor && (
            <>
              <View style={s.divider} />
              <View style={s.row}>
                <Text style={[s.label, noSelect]}>Получатель:</Text>
                <Text style={s.value}>{fineData.vendor}</Text>
              </View>
            </>
          )}

          {fineData.comment && (
            <View style={s.descRow}>
              <Text style={s.commentText}>{fineData.comment}</Text>
            </View>
          )}
        </View>

        {/* Payment button */}
        {SHOW_PAYMENT_UI && !isPaid && (
          <Pressable style={s.payBtn} onPress={handlePay}>
            <Text style={[s.payBtnText, noSelect]}>Оплатить штраф</Text>
            {fineData.discount_percent && (
              <Text style={[s.payBtnSub, noSelect]}>со скидкой {fineData.discount_percent}%</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backBtnText: { fontSize: 22, color: '#3A3A3A' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  headerSub: { fontSize: 14, color: '#888', marginLeft: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  backLink: { fontSize: 16, color: '#3A3A3A', textDecorationLine: 'underline', marginTop: 12 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Status cards
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  statusPaid: { backgroundColor: '#E8F5E9' },
  statusDiscount: { backgroundColor: '#FFF3E0' },
  statusIcon: { fontSize: 20 },
  statusText: { fontSize: 15, color: '#313131', flex: 1 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },

  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  label: { fontSize: 14, color: '#888', marginRight: 8, minWidth: 140 },
  value: { fontSize: 14, color: '#313131', flex: 1 },

  descRow: { marginBottom: 10 },
  descText: { fontSize: 14, color: '#313131', lineHeight: 20 },
  placeText: { fontSize: 13, color: '#656565', lineHeight: 18 },
  commentText: { fontSize: 13, color: '#656565', fontStyle: 'italic' },

  platonBadge: { fontSize: 12, fontWeight: '700', color: '#EE505A', backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  amountText: { fontSize: 18, fontWeight: '700', color: '#313131' },
  fullAmountText: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  discountText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },

  // Pay button
  payBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  payBtnSub: { color: '#B0B0B0', fontSize: 13, marginTop: 2 },
});
