import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { getRnisStatus } from '../../../utils/rnisStatus';

interface Props {
  loading: boolean;
  data: any;
}

export function RnisTab({ loading, data }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  const status = getRnisStatus(data);

  if (!status) {
    return (
      <View style={styles.content}>
        <View style={styles.row}>
          <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
          <Text style={styles.text}>Данные о регистрации в РНИС не найдены</Text>
        </View>
      </View>
    );
  }

  if (!status.registered) {
    return (
      <View style={styles.content}>
        <View style={styles.row}>
          <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
          <Text style={styles.text}>Данные о регистрации в РНИС не найдены</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      {/* Registration */}
      <View style={styles.row}>
        <Image source={require('../../../../assets/images/rnis_success.png')} style={styles.icon} />
        <View>
          <Text style={styles.text}>Зарегистрирован в РНИС.</Text>
          {status.registeredAt != null && (
            <Text style={styles.text}>Дата регистрации: {status.registeredAt}</Text>
          )}
        </View>
      </View>

      {/* Telematics */}
      {status.telematics === 'never' ? (
        <View style={[styles.row, styles.rowMargin]}>
          <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
          <Text style={styles.text}>Навигационные данные в РНИС не поступали</Text>
        </View>
      ) : status.telematics === 'stale' ? (
        <View style={[styles.row, styles.rowMargin]}>
          <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
          <View>
            <Text style={styles.text}>Последняя передача телематики более суток назад</Text>
            {status.lastTransmissionAt != null && (
              <Text style={styles.text}>Последняя передача: {status.lastTransmissionAt}</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.row, styles.rowMargin]}>
          <Image source={require('../../../../assets/images/rnis_success.png')} style={styles.icon} />
          <View>
            <Text style={styles.text}>Телематика передается.</Text>
            {status.lastTransmissionAt != null && (
              <Text style={styles.text}>Последняя передача: {status.lastTransmissionAt}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  content: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowMargin: { marginTop: 16 },
  icon: { width: 24, height: 24, marginRight: 10, marginTop: 2 },
  text: { fontSize: 15, color: '#313131', flexShrink: 1 },
});
