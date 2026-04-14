import React from 'react';
import { View, Text, Image, TouchableHighlight, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  loading: boolean;
  data: any[];
  onOrderPass: () => void;
}

export function PassesTab({ loading, data, onOrderPass }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Пропуска не найдены</Text>
        </View>
      ) : (
        data.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.iconWrap}>
              <Image source={require('../../../../assets/images/truck.png')} style={{ width: 47, height: 36 }} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>
                {item.is_year === 1
                  ? `Годовой, ${item.propusktype}, ${item.type_of_pass_string}, до ${item.pass_end_str}`
                  : `Разовый, до ${item.pass_one_end_str}`}
              </Text>
              <Text style={styles.cardText}>Серия-номер: {item.seriya}</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.buttonWrap}>
        <TouchableHighlight
          style={styles.orderButton}
          activeOpacity={0.8}
          underlayColor="#2A2A2A"
          onPress={onOrderPass}
        >
          <Text style={styles.orderButtonText}>Заказать пропуск</Text>
        </TouchableHighlight>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  emptyWrap: { padding: 20 },
  emptyText: { fontSize: 15, color: '#999' },
  card: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  cardText: { fontSize: 14, color: '#313131', marginBottom: 2 },
  buttonWrap: { paddingHorizontal: 16, paddingVertical: 16 },
  orderButton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
