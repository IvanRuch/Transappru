import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ManualZoneBannerProps {
  visible: boolean;
}

/**
 * Warns the user that the currently selected zone was changed manually and may
 * not match the coordinates picked on the map. Rendered only when `visible`.
 */
export default function ManualZoneBanner({ visible }: ManualZoneBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>
        Зона изменена вручную. Убедитесь, что выбранная зона соответствует адресу.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#FFF3CD',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  text: { fontSize: 12, color: '#856404', textAlign: 'center' },
});
