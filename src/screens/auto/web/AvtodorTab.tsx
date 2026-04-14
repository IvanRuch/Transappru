import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { PaginatedList } from './PaginatedList';

interface Props {
  loading: boolean;
  data: { paid_list: any[]; unpaid_list: any[] };
  paidHidden: boolean;
  unpaidHidden: boolean;
  unpaidSum: number;
  onTogglePaid: () => void;
  onToggleUnpaid: () => void;
}

export function AvtodorTab({ loading, data, paidHidden, unpaidHidden, unpaidSum, onTogglePaid, onToggleUnpaid }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  const renderPaidItem = (item: any, index: number) => (
    <View key={item.id || index} style={styles.card}>
      <View style={styles.cardIcon}>
        <Image source={require('../../../../assets/images/uil_check_2.png')} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>Проезд {item.pass_at}</Text>
        <Text style={styles.cardText}>{item.road_name}</Text>
        <Text style={styles.cardText}>{item.pass_place}</Text>
        <Text style={styles.cardText}>Сумма оплаты {item.price}</Text>
        <Text style={styles.cardText}>Оператор {item.operator_description}</Text>
      </View>
    </View>
  );

  const renderUnpaidItem = (item: any, index: number) => (
    <View key={item.id || index} style={styles.card}>
      <View style={styles.cardIcon}>
        <Image source={require('../../../../assets/images/uil_exclamation-triangle_2.png')} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>Проезд {item.pass_at}</Text>
        <Text style={styles.cardText}>{item.road_name}</Text>
        <Text style={styles.cardText}>{item.pass_place}</Text>
        <Text style={styles.cardText}>Сумма оплаты {item.price}</Text>
        <Text style={styles.cardText}>Оператор {item.operator_description}</Text>
      </View>
    </View>
  );

  return (
    <View>
      {/* Paid */}
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

      {/* Unpaid */}
      <Pressable onPress={onToggleUnpaid}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Проезды к оплате {data.unpaid_list.length ? `(${data.unpaid_list.length})` : 'не обнаружены'}
          </Text>
        </View>
      </Pressable>
      {unpaidHidden && (
        <>
          <PaginatedList data={data.unpaid_list} renderItem={renderUnpaidItem} />
          {data.unpaid_list.length > 0 && (
            <View style={styles.totalCard}>
              <Text style={styles.totalText}>Всего: {unpaidSum} руб</Text>
            </View>
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
  totalCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#313131' },
});
