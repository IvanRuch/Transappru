import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  loading: boolean;
  data: any;
}

export function DiagnosticCardTab({ loading, data }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  if (typeof data.number === 'undefined') {
    return (
      <View style={styles.content}>
        <Text style={styles.text}>Действующие диагностические карты не найдены</Text>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <Text style={styles.text}>Номер карты {data.number}</Text>
      <Text style={styles.text}>Место выдачи {data.place}</Text>
      <Text style={styles.text}>Дата окончания действия: {data.date_to}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  content: { padding: 20 },
  text: { fontSize: 15, color: '#313131', marginBottom: 4 },
});
