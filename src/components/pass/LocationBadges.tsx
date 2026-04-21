import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface LocationTypes {
  mkad?: 0 | 1;
  ttk?:  0 | 1;
  sk?:   0 | 1;
}

interface LocationBadgesProps {
  types?: LocationTypes | null;
}

/**
 * Vertical stack of three zone badges (МКАД/ТТК/СК). Each badge is colored
 * when its zone is included for this address, and grey otherwise.
 *
 * Colors match legacy design:
 *  - МКАД #57B6ED (blue)
 *  - ТТК  #19B28D (green)
 *  - СК   #EE505A (red)
 */
export default function LocationBadges({ types }: LocationBadgesProps) {
  const t = types || {};
  return (
    <View style={styles.container}>
      <View style={[styles.badge, t.mkad === 1 ? styles.mkadOn : styles.off]}>
        <Text style={styles.text}>МКАД</Text>
      </View>
      <View style={[styles.badge, t.ttk === 1 ? styles.ttkOn : styles.off]}>
        <Text style={styles.text}>ТТК</Text>
      </View>
      <View style={[styles.badge, t.sk === 1 ? styles.skOn : styles.off]}>
        <Text style={styles.text}>СК</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 40 },
  badge: {
    alignItems: 'center',
    margin: 1,
    borderRadius: 2,
    paddingVertical: 1,
  },
  text: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  mkadOn: { backgroundColor: '#57B6ED' },
  ttkOn:  { backgroundColor: '#19B28D' },
  skOn:   { backgroundColor: '#EE505A' },
  off:    { backgroundColor: '#8C8C8C' },
});
