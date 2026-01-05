import React from 'react';
import { View, Text, TouchableHighlight, Image, StyleSheet } from 'react-native';
import { ChargeItem } from '../../types/charges';

interface ChargeCardProps {
  item: ChargeItem;
  showAutoInfo?: boolean;
  onPress?: (item: ChargeItem) => void;
}

export const ChargeCard: React.FC<ChargeCardProps> = ({ item, showAutoInfo = false, onPress }) => {
  const isPaid = item.is_paid === '1' || item.is_paid === 1;
  const isPlaton = item.is_platon === '1' || item.is_platon === 1;
  const isFssp = item.is_to_fssp === '1' || item.is_to_fssp === 1;

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Image 
          source={
            isPaid 
              ? require('../../../assets/images/uil_check_2.png')
              : require('../../../assets/images/uil_exclamation-triangle_2.png')
          }
        />
      </View>

      <View style={styles.contentContainer}>
        {/* Дата постановления */}
        <View style={styles.row}>
          <Text style={styles.text}>Постановление от {item.dat}</Text>
        </View>

        {/* Сумма штрафа */}
        {isPlaton ? (
          <View style={styles.row}>
            <Text style={styles.errorText}>Штраф системы ПЛАТОН {item.sum} ₽</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.text}>Штраф {item.sum} ₽</Text>
          </View>
        )}

        {/* Передано в ФССП */}
        {isFssp && (
          <View style={styles.row}>
            <Text style={styles.errorText}>Передано в ФССП {item.to_fssp_at}</Text>
          </View>
        )}

        {/* Скидка */}
        {item.discount_str && (
          <View style={styles.row}>
            <Text style={styles.text}>{item.discount_str}</Text>
          </View>
        )}

        {/* Описание нарушения */}
        <View style={styles.row}>
          <Text style={styles.text}>{item.description}</Text>
        </View>

        {/* Место нарушения (если есть) */}
        {item.offence_place && (
          <View style={styles.row}>
            <Text style={styles.smallText}>{item.offence_place}</Text>
          </View>
        )}

        {/* Информация об авто (для "других" начислений) */}
        {showAutoInfo && !item.user_auto && (
          <View style={[styles.row, styles.noAutoInfo]}>
            <Text style={styles.noAutoText}>Не привязано к авто</Text>
          </View>
        )}
      </View>

      {/* Стрелка для перехода */}
      {onPress && (
        <View style={styles.arrowContainer}>
          <TouchableHighlight
            style={styles.arrowButton}
            activeOpacity={1}
            underlayColor='#EEEEEE'
            onPress={() => onPress(item)}
          >
            <Image source={require('../../../assets/images/arrow_to_right_2.png')}/>
          </TouchableHighlight>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    margin: 20,
    padding: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  iconContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  contentContainer: {
    flex: 5,
    flexDirection: 'column',
    paddingLeft: 10,
  },
  row: {
    flexDirection: 'row',
  },
  text: {
    color: '#313131',
  },
  errorText: {
    color: '#EE505A',
  },
  smallText: {
    color: '#313131',
    fontSize: 12,
  },
  noAutoInfo: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#D0D0D0',
  },
  noAutoText: {
    color: '#909090',
    fontSize: 12,
    fontStyle: 'italic',
  },
  arrowContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  arrowButton: {
    paddingTop: 20,
    paddingLeft: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
});
