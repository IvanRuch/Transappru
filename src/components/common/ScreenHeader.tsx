import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightComponent?: React.ReactNode;
}

/**
 * Standard screen header: back button on the left, centered title, optional
 * right slot. Works identically on mobile and web; on web adds cursor:pointer
 * on the back button and disables text selection on the title.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightComponent }) => {
  return (
    <View style={styles.headerRow}>
      <Pressable
        style={styles.headerBackButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={8}
      >
        <Image
          source={require('../../../assets/images/back_2.png')}
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <Text style={styles.header} numberOfLines={1} selectable={false}>
        {title}
      </Text>

      {rightComponent && (
        <View style={styles.headerRightContainer}>
          {rightComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },

  headerBackButton: {
    padding: 8,
    marginRight: 10,
    ...Platform.select({
      web: { cursor: 'pointer' as any },
    }),
  },

  header: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
    marginRight: 40, // Компенсация для центрирования
  },

  headerRightContainer: {
    position: 'absolute',
    right: 15,
  },
});
