import React from 'react';
import { View, Text, TouchableHighlight, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  loading: boolean;
  data: any;
  autoData: any;
  onOrderPolicy: () => void;
}

export function OsagoTab({ loading, data, autoData, onOrderPolicy }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  const hasPolicy = typeof data.number !== 'undefined';
  const showOrderButton = !hasPolicy || autoData?.check_osago_date_to_left === '';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {!hasPolicy ? (
          <Text style={styles.text}>Действующие полисы ОСАГО не найдены</Text>
        ) : (
          <>
            <Text style={styles.text}>Серия договора {data.series}</Text>
            <Text style={styles.text}>Номер договора {data.number}</Text>
            <Text style={styles.text}>Страховая компания {data.insurer}</Text>
            <Text style={styles.text}>
              Ограничение лиц, допущенных к управлению транспортным средством:{' '}
              {data.restrictions === 'WITH RESTRICTIONS' ? 'с ограничениями' : 'без ограничений'}
            </Text>
            <Text style={styles.text}>Дата окончания действия договора: {data.date_to}</Text>
          </>
        )}
      </View>

      {showOrderButton && (
        <View style={styles.buttonWrap}>
          <TouchableHighlight
            style={styles.orderButton}
            activeOpacity={0.8}
            underlayColor="#2A2A2A"
            onPress={onOrderPolicy}
          >
            <Text style={styles.orderButtonText}>Заказать полис</Text>
          </TouchableHighlight>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20 },
  text: { fontSize: 15, color: '#313131', marginBottom: 4 },
  buttonWrap: { paddingHorizontal: 16, paddingBottom: 16 },
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
