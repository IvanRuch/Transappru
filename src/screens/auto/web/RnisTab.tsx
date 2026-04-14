import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  loading: boolean;
  data: any;
}

export function RnisTab({ loading, data }: Props) {
  if (loading) {
    return <ActivityIndicator size="large" color="#313131" style={styles.loader} />;
  }

  const hasRegistration = typeof data.registrationOk !== 'undefined';

  return (
    <View style={styles.content}>
      {/* Registration status */}
      {!hasRegistration || data.registrationOk !== 1 ? (
        <View style={styles.row}>
          <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
          <Text style={styles.text}>Данные о регистрации в РНИС не найдены</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Image source={require('../../../../assets/images/rnis_success.png')} style={styles.icon} />
          <View>
            <Text style={styles.text}>Зарегистрирован в РНИС.</Text>
            {data.rnis_registered != null && (
              <Text style={styles.text}>Дата регистрации: {data.rnis_registered}</Text>
            )}
          </View>
        </View>
      )}

      {/* Telematics status (only if registration data exists) */}
      {hasRegistration && (
        data.telematicsOk === 0 ? (
          <View style={[styles.row, styles.rowMargin]}>
            <Image source={require('../../../../assets/images/rnis_unsuccess.png')} style={styles.icon} />
            <Text style={styles.text}>Навигационные данные в РНИС не поступали</Text>
          </View>
        ) : (
          <View style={[styles.row, styles.rowMargin]}>
            <Image source={require('../../../../assets/images/rnis_success.png')} style={styles.icon} />
            <View>
              <Text style={styles.text}>Телематика передается.</Text>
              {data.telematics_date !== 0 && (
                <Text style={styles.text}>Последняя передача: {data.telematics_date}</Text>
              )}
            </View>
          </View>
        )
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
