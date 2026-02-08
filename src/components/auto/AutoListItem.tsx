import React from 'react';
import { View, Text, TouchableHighlight, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { AutoItem } from '../../types/auto';

interface AutoListItemProps {
  item: AutoItem;
  index: number;
  onPress: (item: AutoItem) => void;
  onMark: (item: AutoItem, index: number) => void;
  onShowHideTab: (tabName: string, index: number) => void;
}

export const AutoListItem: React.FC<AutoListItemProps> = ({ item, index, onPress, onMark, onShowHideTab }) => {
  // Определяем стиль элемента (отмечен или нет)
  const itemStyle = {
    padding: 20,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: item.marked ? '#E9E9E9' : '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  };

  // Получить цвет для текста
  const getTextColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: '#40882C',
      red: '#EE505A',
      yellow: '#FFA500',
      white: '#3A3A3A',
    };
    return colorMap[color] || '#3A3A3A';
  };

  // Получить цвет фона
  const getBgColor = (color: string) => {
    const bgMap: Record<string, string> = {
      green: '#E8F8E8',
      red: '#FFE7E7',
      yellow: '#FAEEBA',
      white: '#F7F7F7',
    };
    return bgMap[color] || '#F7F7F7';
  };

  // Рендер "пустых" ячеек, если нет данных
  const renderEmptyPass = () => (
    <View style={[styles.passCell, { flex: 7, backgroundColor: getBgColor('white') }]}>
      <Text style={styles.passCellText}>{item.check_passes_string || 'нет данных о пропуске'}</Text>
    </View>
  );

  return (
    <Pressable onPress={() => onMark(item, index)}>
      <View style={itemStyle}>
        {/* Заголовок - номер авто */}
        <View style={{ flexDirection: "row", alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#313131" }}>
              {item.auto_number_base}{item.auto_number_region_code}
            </Text>
          </View>
          <TouchableHighlight
            style={{ paddingLeft: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}
            activeOpacity={0.7}
            underlayColor="transparent"
            onPress={() => onPress(item)}
          >
            <Image source={require('../../../assets/images/arrow_to_right_2.png')} />
          </TouchableHighlight>
        </View>

        {/* Разделитель */}
        <View style={{ borderBottomColor: "#DDDDDD", borderBottomWidth: 1, height: 10, width: "100%" }} />

        {/* Текущие пропуска */}
        {item.check_passes_expared == 0 ? (
          <>
            <View style={styles.passRow}>
              {/* Иконка пропуска */}
              <View style={[styles.passCell, { flex: 1, backgroundColor: getBgColor('white'), marginRight: 5 }]}>
                <Image source={require('../../../assets/images/pass_item.png')} />
              </View>

              {item.check_passes_year_propusktype && item.check_passes_year_propusktype !== '' ? (
                <>
                  {/* СК */}
                  <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                    <Text style={styles.passCellText}>{item.check_passes_year_propusktype}</Text>
                  </View>
                  {/* Дневной */}
                  <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                    <Text style={styles.passCellText}>{item.check_passes_year_type_of_pass_string}</Text>
                  </View>
                  {/* Действителен/Аннулирован */}
                  {item.check_passes_year_cancelled != 1 ? (
                    <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('green') }]}>
                      <Text style={{ color: getTextColor('green') }}>Действителен</Text>
                    </View>
                  ) : (
                    <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('red') }]}>
                      <Text style={{ color: getTextColor('red') }}>Аннулирован</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={[styles.passCell, { flex: 7, backgroundColor: getBgColor('white') }]}>
                  <Text style={styles.passCellText}>{item.check_passes_string || 'нет данных'}</Text>
                </View>
              )}
            </View>

            {/* Дней осталось */}
            {item.check_passes_year_propusktype && (
              <View style={styles.daysRow}>
                <View style={{ flex: 4, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_passes_year_period_color || 'white') }}>
                    {item.check_passes_year_cancelled != 1
                      ? `дней осталось: ${item.check_passes_pass_end_left}`
                      : 'был аннулирован'}
                  </Text>
                </View>
                <View style={{ flex: 3, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_passes_year_period_color || 'white') }}>
                    {item.check_passes_year_cancelled != 1
                      ? `до ${item.check_passes_pass_end_str}`
                      : item.check_passes_dat_cancel_year_str}
                  </Text>
                </View>
              </View>
            )}

            {/* Еще один пропуск (если есть) */}
            {item.check_passes_another_year_propusktype && item.check_passes_another_year_propusktype !== '' && (
              <>
                <View style={styles.passRow}>
                  <View style={[styles.passCell, { flex: 1, marginRight: 5 }]} />
                  <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                    <Text style={styles.passCellText}>{item.check_passes_another_year_propusktype}</Text>
                  </View>
                  <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                    <Text style={styles.passCellText}>{item.check_passes_another_year_type_of_pass_string}</Text>
                  </View>
                  <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('green') }]}>
                    <Text style={{ color: getTextColor('green') }}>Действителен</Text>
                  </View>
                </View>
                <View style={styles.daysRow}>
                  <View style={{ flex: 4, alignItems: 'center' }}>
                    <Text style={{ color: getTextColor('green') }}>
                      дней осталось: {item.check_passes_another_pass_end_left}
                    </Text>
                  </View>
                  <View style={{ flex: 3, alignItems: 'center' }}>
                    <Text style={{ color: getTextColor('green') }}>до {item.check_passes_another_pass_end_str}</Text>
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.passRow}>
            <View style={[styles.passCell, { flex: 1, backgroundColor: getBgColor('white'), marginRight: 5 }]}>
              <Image source={require('../../../assets/images/pass_item.png')} />
            </View>
            <View style={[styles.passCell, { flex: 6, backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <ActivityIndicator size="small" color="#313131" animating={true} />
                <Text style={[styles.passCellText, { paddingLeft: 10 }]}>обновление...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Статус заявки */}
        {item.status_header && item.status_header !== '' && (
          <>
            <View style={styles.passRow}>
              <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                <Text style={styles.passCellText}>{item.status_propusktype}</Text>
              </View>
              <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                <Text style={styles.passCellText}>{item.status_type_of_pass_string}</Text>
              </View>
              <View style={[styles.passCell, { flex: 4, backgroundColor: getBgColor('yellow') }]}>
                <Text style={{ fontSize: 14, color: getTextColor('yellow') }}>
                  {item.status_header}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Задолженность */}
        {item.debt_sum && item.debt_sum !== '0.00' && (
          <View style={styles.debtRow}>
            <View style={{ flex: 4, alignItems: 'center' }}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Image source={require('../../../assets/images/alert-circle.png')} />
                <Text style={{ color: getTextColor('red') }}> задолженность</Text>
              </View>
            </View>
            <View style={{ flex: 3, alignItems: 'center' }}>
              <Text style={{ color: getTextColor('red') }}>{item.debt_sum}₽</Text>
            </View>
          </View>
        )}

        {/* Разделитель */}
        <View style={{ borderBottomColor: "#DDDDDD", borderBottomWidth: 1, height: 10, width: "100%" }} />

        {/* Штрафы - Платные дороги */}
        <View style={styles.checksRow}>
          {/* Штрафы */}
          {item.check_fines_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { backgroundColor: getBgColor(item.check_fines_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_fines_color || 'white')}
              onPress={() => onShowHideTab('fines', index)}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: getTextColor(item.check_fines_color || 'white') }}>Штрафы</Text>
                {item.check_fines_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#3A3A3A', paddingRight: 5 }}>Штрафы</Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* Платные дороги */}
          {item.check_avtodor_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { backgroundColor: getBgColor(item.check_avtodor_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_avtodor_color || 'white')}
              onPress={() => onShowHideTab('avtodor', index)}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: getTextColor(item.check_avtodor_color || 'white') }}>Платные дороги</Text>
                {item.check_avtodor_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#3A3A3A', paddingRight: 5 }}>Платные дороги</Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}
        </View>

        {/* ОСАГО - ДК */}
        <View style={styles.checksRow}>
          {/* ОСАГО */}
          {item.check_osago_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { backgroundColor: getBgColor(item.check_osago_period_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_osago_period_color || 'white')}
              onPress={() => onShowHideTab('osago', index)}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: getTextColor(item.check_osago_period_color || 'white') }}>ОСАГО</Text>
                {item.check_osago_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#3A3A3A', paddingRight: 5 }}>ОСАГО</Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* ДК */}
          {item.check_diagnostic_card_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { backgroundColor: getBgColor(item.check_diagnostic_card_period_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_diagnostic_card_period_color || 'white')}
              onPress={() => onShowHideTab('diagnostic_card', index)}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: getTextColor(item.check_diagnostic_card_period_color || 'white') }}>ДК</Text>
                {item.check_diagnostic_card_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#3A3A3A', paddingRight: 5 }}>ДК</Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* РНИС */}
          {item.check_rnis_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { backgroundColor: getBgColor(item.check_rnis_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_rnis_color || 'white')}
              onPress={() => onShowHideTab('rnis', index)}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: getTextColor(item.check_rnis_color || 'white') }}>РНИС</Text>
                {item.check_rnis_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#3A3A3A', paddingRight: 5 }}>РНИС</Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}
        </View>

        {/* Детали штрафов */}
        {item.check_fines_tab_show != 0 && item.check_fines_string && (
          <View style={styles.detailsRow}>
            <View style={{ flex: 7, alignItems: 'center' }}>
              <Text style={{ color: getTextColor(item.check_fines_color || 'white') }}>
                {item.check_fines_string}
              </Text>
            </View>
          </View>
        )}

        {/* Детали ОСАГО */}
        {item.check_osago_tab_show != 0 && (
          <View style={styles.detailsRow}>
            {item.check_osago_date_to_left && item.check_osago_date_to_left !== '' ? (
              <>
                <View style={{ flex: 4, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_osago_period_color || 'white') }}>
                    дней осталось: {item.check_osago_date_to_left}
                  </Text>
                </View>
                <View style={{ flex: 3, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_osago_period_color || 'white') }}>
                    до {item.check_osago_date_to_str}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ flex: 7, alignItems: 'center' }}>
                <Text style={{ color: getTextColor(item.check_osago_period_color || 'white') }}>
                  {item.check_osago_string}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Детали ДК */}
        {item.check_diagnostic_card_tab_show != 0 && (
          <View style={styles.detailsRow}>
            {item.check_diagnostic_card_date_to_left && item.check_diagnostic_card_date_to_left !== '' ? (
              <>
                <View style={{ flex: 4, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_diagnostic_card_period_color || 'white') }}>
                    дней осталось: {item.check_diagnostic_card_date_to_left}
                  </Text>
                </View>
                <View style={{ flex: 3, alignItems: 'center' }}>
                  <Text style={{ color: getTextColor(item.check_diagnostic_card_period_color || 'white') }}>
                    до {item.check_diagnostic_card_date_to_str}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ flex: 7, alignItems: 'center' }}>
                <Text style={{ color: getTextColor(item.check_diagnostic_card_period_color || 'white') }}>
                  {item.check_diagnostic_card_string}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Детали платных дорог */}
        {item.check_avtodor_tab_show != 0 && item.check_avtodor_string && (
          <View style={styles.detailsRow}>
            <View style={{ flex: 7, alignItems: 'center' }}>
              <Text style={{ color: getTextColor(item.check_avtodor_color || 'white') }}>
                {item.check_avtodor_string}
              </Text>
            </View>
          </View>
        )}

        {/* Детали РНИС */}
        {item.check_rnis_tab_show != 0 && (
          <View style={styles.detailsRow}>
            <View style={{ flex: 7, alignItems: 'center' }}>
              <Text>
                <Text style={{ color: getTextColor(item.check_rnis_reestr_color || 'white') }}>
                  {item.check_rnis_reestr_string}
                </Text>
                <Text style={{ color: getTextColor(item.check_rnis_telematics_color || 'white') }}>
                  {', '}{item.check_rnis_telematics_string}
                </Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  passRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  passCell: {
    alignItems: 'center',
    height: 29,
    padding: 5,
    marginRight: 5,
    justifyContent: 'center',
  },
  passCellText: {
    fontSize: 14,
    color: '#3A3A3A',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  checksRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  checkTab: {
    flex: 1,
    alignItems: 'center',
    height: 29,
    padding: 5,
    marginRight: 5,
    justifyContent: 'center',
    borderRadius: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
});
