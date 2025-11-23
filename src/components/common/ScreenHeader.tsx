import React from 'react';
import { View, Text, TouchableHighlight, Image, StyleSheet } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightComponent?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightComponent }) => {
  return (
    <View style={styles.headerRow}>
      <TouchableHighlight
        style={styles.headerBackButton}
        activeOpacity={0.7}
        underlayColor="transparent"
        onPress={onBack}
      >
        <Image source={require('../../../assets/images/back_2.png')} />
      </TouchableHighlight>
      
      <Text style={styles.header}>{title}</Text>
      
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
