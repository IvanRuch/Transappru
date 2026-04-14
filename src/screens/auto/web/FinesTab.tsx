import React from 'react';
import { View, Text, Image, Pressable, TouchableHighlight, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SHOW_PAYMENT_UI } from '../../../config/features';
import { PaginatedList } from './PaginatedList';

interface Props {
  loading: boolean;
  data: { paid_list: any[]; unpaid_list: any[] };
  paidHidden: boolean;
  unpaidHidden: boolean;
  unpaidSum: number;
  autoData: any;
  onTogglePaid: () => void;
  onToggleUnpaid: () => void;
}

export function FinesTab({ loading, data, paidHidden, unpaidHidden, unpaidSum, autoData, onTogglePaid, onToggleUnpaid }: Props) {
  const router = useRouter();

  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  const navigateToFine = (item: any) => {
    router.push({
      pathname: '/(authenticated)/auto-fine' as any,
      params: { fine_data: JSON.stringify(item) },
    });
  };

  const navigateToPayment = () => {
    router.push({
      pathname: '/(authenticated)/fine-payment-confirm' as any,
      params: {
        charges: JSON.stringify(data.unpaid_list),
        auto_data: JSON.stringify(autoData),
      },
    });
  };

  const renderPaidItem = (item: any, index: number) => (
    <View key={item.id || index} style={styles.card}>
      <View style={styles.cardIcon}>
        <Image source={require('../../../../assets/images/uil_check_2.png')} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>Постановление от {item.dat}</Text>
        <Text style={styles.cardText}>Штраф {item.sum}</Text>
        <Text style={styles.cardText}>{item.description}</Text>
      </View>
      <Pressable style={styles.arrowBtn} onPress={() => navigateToFine(item)}>
        <Image source={require('../../../../assets/images/arrow_to_right_2.png')} />
      </Pressable>
    </View>
  );

  const renderUnpaidItem = (item: any, index: number) => (
    <View key={item.id || index} style={styles.card}>
      <View style={styles.cardIcon}>
        <Image source={require('../../../../assets/images/uil_exclamation-triangle_2.png')} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>Постановление от {item.dat}</Text>
        {item.is_platon !== 0 ? (
          <Text style={styles.textRed}>Штраф системы ПЛАТОН {item.sum}</Text>
        ) : (
          <Text style={styles.cardText}>Штраф {item.sum}</Text>
        )}
        {item.is_to_fssp !== 0 && (
          <Text style={styles.textRed}>Передано в ФССП {item.to_fssp_at}</Text>
        )}
        {item.discount_str !== '' && (
          <Text style={styles.cardText}>{item.discount_str}</Text>
        )}
        <Text style={styles.cardText}>{item.description}</Text>
      </View>
      <Pressable style={styles.arrowBtn} onPress={() => navigateToFine(item)}>
        <Image source={require('../../../../assets/images/arrow_to_right_2.png')} />
      </Pressable>
    </View>
  );

  return (
    <View>
      {/* Paid fines */}
      <Pressable onPress={onTogglePaid}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Оплаченные ранее {data.paid_list.length ? `(${data.paid_list.length})` : 'не обнаружены'}
          </Text>
        </View>
      </Pressable>
      {paidHidden && (
        <PaginatedList data={data.paid_list} renderItem={renderPaidItem} />
      )}

      {/* Unpaid fines */}
      <Pressable onPress={onToggleUnpaid}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Штрафы к оплате {data.unpaid_list.length ? `(${data.unpaid_list.length})` : 'не обнаружены'}
          </Text>
        </View>
      </Pressable>
      {unpaidHidden && (
        <>
          <PaginatedList data={data.unpaid_list} renderItem={renderUnpaidItem} />

          {SHOW_PAYMENT_UI && data.unpaid_list.length > 0 && (
            <>
              <View style={styles.totalCard}>
                <Text style={styles.totalText}>Всего: {unpaidSum} руб</Text>
              </View>
              <View style={styles.payButtonWrap}>
                <TouchableHighlight
                  style={styles.payButton}
                  activeOpacity={0.8}
                  underlayColor="#2E2E2E"
                  onPress={navigateToPayment}
                >
                  <Text style={styles.payButtonText}>Оплатить все штрафы</Text>
                </TouchableHighlight>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  sectionHeader: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#313131' },
  card: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardContent: { flex: 1, paddingLeft: 4 },
  cardText: { fontSize: 14, color: '#313131', marginBottom: 2 },
  textRed: { fontSize: 14, color: '#EE505A', marginBottom: 2 },
  arrowBtn: {
    paddingLeft: 10,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  totalCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#313131' },
  payButtonWrap: { marginHorizontal: 20, marginTop: 10, marginBottom: 16 },
  payButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
});
