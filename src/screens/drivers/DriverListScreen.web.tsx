/**
 * Web version of DriverListScreen.
 * Reuses the DriversTab component (same as inline tab in AutoDetailScreen).
 * Wrapped in WebAppLayout for consistent sidebar navigation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WebAppLayout from '../../components/web/WebAppLayout';
import { DriversTab } from '../auto/web/DriversTab';

export default function DriverListScreen() {
  return (
    <WebAppLayout>
      <View style={styles.header}>
        <Text style={styles.title}>Водители</Text>
      </View>
      <DriversTab />
    </WebAppLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
