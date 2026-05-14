import React, { memo } from 'react';
import { View, Text, TouchableHighlight, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { AutoItem } from '../../types/auto';

interface AutoListItemProps {
  item: AutoItem;
  index: number;
  onPress: (item: AutoItem) => void;
  onMark: (item: AutoItem, index: number) => void;
  onShowHideTab: (tabName: string, index: number) => void;
  onOrderOsagoPolicy?: (item: AutoItem) => void;
  /**
   * Stretch the card vertically to fill the parent cell. Used by the web
   * grid (`AutoListScreen.web`) so every card in a row has the same height
   * as the tallest one. The card's own margins are dropped — the parent
   * cell is expected to provide spacing.
   */
  fillHeight?: boolean;
}

export const AutoListItem = memo(({ item, index, onPress, onMark, onShowHideTab, onOrderOsagoPolicy, fillHeight }: AutoListItemProps) => {
  // Определяем стиль элемента (отмечен или нет).
  // В grid-режиме (fillHeight=true) карточка растягивается и сама не даёт
  // отступов — их добавляет обёрточная ячейка. На мобиле (single column)
  // margins работают как вертикальный разделитель между карточками списка.
  const itemStyle = {
    padding: 20,
    borderRadius: 10,
    backgroundColor: item.marked ? '#E9E9E9' : '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B8B8B8',
    ...(fillHeight
      ? { flex: 1 }
      : { marginBottom: 10, marginLeft: 10, marginRight: 10 }),
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
    <Pressable
      onPress={() => onMark(item, index)}
      style={fillHeight ? { flex: 1 } : undefined}
    >
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
              {/* Иконка пропуска — flex 2 (icon column = 10% при total 20) */}
              <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white'), marginRight: 5 }]}>
                <Image source={require('../../../assets/images/pass_item.png')} />
              </View>

              {item.check_passes_year_propusktype && item.check_passes_year_propusktype !== '' ? (
                <>
                  {/* СК (тип пропуска) — flex 3 (15%); короткие лейблы (СК/МКАД/ТТК) */}
                  <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('white') }]}>
                    <Text numberOfLines={1} style={styles.passCellText}>
                      {item.check_passes_year_propusktype}
                    </Text>
                  </View>
                  {/* Тип действия — flex 6 (30%); «Дневной»/«Ночной»/«Круглосуточный» */}
                  <View style={[styles.passCell, { flex: 6, backgroundColor: getBgColor('white') }]}>
                    <Text numberOfLines={1} style={styles.passCellText}>
                      {item.check_passes_year_type_of_pass_string}
                    </Text>
                  </View>
                  {/* Действителен/Аннулирован — flex 9 (45%); самый длинный лейбл в строке */}
                  {item.check_passes_year_cancelled != 1 ? (
                    <View style={[styles.passCell, { flex: 9, backgroundColor: getBgColor('green') }]}>
                      <Text numberOfLines={1} style={[styles.passCellText, { color: getTextColor('green') }]}>
                        Действителен
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.passCell, { flex: 9, backgroundColor: getBgColor('red') }]}>
                      <Text numberOfLines={1} style={[styles.passCellText, { color: getTextColor('red') }]}>
                        Аннулирован
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                // Если нет детальных данных, но есть строка - показываем ее в одном блоке.
                // Если и строки нет - показываем "нет данных". flex 18 = data-row total (20) − icon (2).
                <View style={[styles.passCell, { flex: 18, backgroundColor: getBgColor('white') }]}>
                  <Text style={styles.passCellText}>{item.check_passes_string || 'нет данных'}</Text>
                </View>
              )}
            </View>

            {/* Дней осталось */}
            {!!item.check_passes_year_propusktype && (
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

            {/* Еще один пропуск (если есть) — те же flex-пропорции (2/3/6/9 = 20), что и у первичного pass-row */}
            {item.check_passes_another_year_propusktype && item.check_passes_another_year_propusktype !== '' && (
              <>
                <View style={styles.passRow}>
                  <View style={[styles.passCell, { flex: 2, marginRight: 5 }]} />
                  <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('white') }]}>
                    <Text numberOfLines={1} style={styles.passCellText}>
                      {item.check_passes_another_year_propusktype}
                    </Text>
                  </View>
                  <View style={[styles.passCell, { flex: 6, backgroundColor: getBgColor('white') }]}>
                    <Text numberOfLines={1} style={styles.passCellText}>
                      {item.check_passes_another_year_type_of_pass_string}
                    </Text>
                  </View>
                  <View style={[styles.passCell, { flex: 9, backgroundColor: getBgColor('green') }]}>
                    <Text numberOfLines={1} style={[styles.passCellText, { color: getTextColor('green') }]}>
                      Действителен
                    </Text>
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
            <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white'), marginRight: 5 }]}>
              <Image source={require('../../../assets/images/pass_item.png')} />
            </View>
            {/* flex 18 = data-row total (20) − icon (2) — visual parity с pass-row */}
            <View style={[styles.passCell, { flex: 18, backgroundColor: getBgColor('white') }]}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <ActivityIndicator size="small" color="#313131" animating={true} />
                <Text style={[styles.passCellText, { paddingLeft: 10 }]}>обновление...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Статус заявки — 3 cell-row, оставляем без icon-колонки; ratio 2 / 3 / 5 параллельно pass-row data total */}
        {!!item.status_header && item.status_header !== '' && (
          <>
            <View style={styles.passRow}>
              <View style={[styles.passCell, { flex: 2, backgroundColor: getBgColor('white') }]}>
                <Text numberOfLines={1} style={styles.passCellText}>{item.status_propusktype}</Text>
              </View>
              <View style={[styles.passCell, { flex: 3, backgroundColor: getBgColor('white') }]}>
                <Text numberOfLines={1} style={styles.passCellText}>{item.status_type_of_pass_string}</Text>
              </View>
              <View style={[styles.passCell, { flex: 5, backgroundColor: getBgColor('yellow') }]}>
                <Text numberOfLines={1} style={[styles.passCellText, { color: getTextColor('yellow') }]}>
                  {item.status_header}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Задолженность */}
        {!!item.debt_sum && item.debt_sum !== '0.00' && (
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
          {/* Штрафы — flex 7 (label length proxy) */}
          {item.check_fines_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { flex: 7, backgroundColor: getBgColor(item.check_fines_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_fines_color || 'white')}
              onPress={() => onShowHideTab('fines', index)}
            >
              <View style={styles.checkTabInner}>
                <Text
                  numberOfLines={1}
                  style={[styles.checkTabText, { color: getTextColor(item.check_fines_color || 'white') }]}
                >
                  Штрафы
                </Text>
                {item.check_fines_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { flex: 7, backgroundColor: getBgColor('white') }]}>
              <View style={styles.checkTabInner}>
                <Text numberOfLines={1} style={[styles.checkTabText, { color: '#3A3A3A', paddingRight: 5 }]}>
                  Штрафы
                </Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* Платные дороги — flex 14 (label twice as long as Штрафы) */}
          {item.check_avtodor_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { flex: 14, backgroundColor: getBgColor(item.check_avtodor_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_avtodor_color || 'white')}
              onPress={() => onShowHideTab('avtodor', index)}
            >
              <View style={styles.checkTabInner}>
                <Text
                  numberOfLines={1}
                  style={[styles.checkTabText, { color: getTextColor(item.check_avtodor_color || 'white') }]}
                >
                  Платные дороги
                </Text>
                {item.check_avtodor_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { flex: 14, backgroundColor: getBgColor('white') }]}>
              <View style={styles.checkTabInner}>
                <Text numberOfLines={1} style={[styles.checkTabText, { color: '#3A3A3A', paddingRight: 5 }]}>
                  Платные дороги
                </Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}
        </View>

        {/* ОСАГО - ДК */}
        <View style={styles.checksRow}>
          {/* ОСАГО — flex 1 */}
          {item.check_osago_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor(item.check_osago_period_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_osago_period_color || 'white')}
              onPress={() => onShowHideTab('osago', index)}
            >
              <View style={styles.checkTabInner}>
                <Text
                  numberOfLines={1}
                  style={[styles.checkTabText, { color: getTextColor(item.check_osago_period_color || 'white') }]}
                >
                  ОСАГО
                </Text>
                {item.check_osago_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor('white') }]}>
              <View style={styles.checkTabInner}>
                <Text numberOfLines={1} style={[styles.checkTabText, { color: '#3A3A3A', paddingRight: 5 }]}>
                  ОСАГО
                </Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* ДК — flex 1 */}
          {item.check_diagnostic_card_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor(item.check_diagnostic_card_period_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_diagnostic_card_period_color || 'white')}
              onPress={() => onShowHideTab('diagnostic_card', index)}
            >
              <View style={styles.checkTabInner}>
                <Text
                  numberOfLines={1}
                  style={[styles.checkTabText, { color: getTextColor(item.check_diagnostic_card_period_color || 'white') }]}
                >
                  ДК
                </Text>
                {item.check_diagnostic_card_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor('white') }]}>
              <View style={styles.checkTabInner}>
                <Text numberOfLines={1} style={[styles.checkTabText, { color: '#3A3A3A', paddingRight: 5 }]}>
                  ДК
                </Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}

          {/* РНИС — flex 1 */}
          {item.check_rnis_expared == 0 ? (
            <TouchableHighlight
              style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor(item.check_rnis_color || 'white') }]}
              activeOpacity={1}
              underlayColor={getBgColor(item.check_rnis_color || 'white')}
              onPress={() => onShowHideTab('rnis', index)}
            >
              <View style={styles.checkTabInner}>
                <Text
                  numberOfLines={1}
                  style={[styles.checkTabText, { color: getTextColor(item.check_rnis_color || 'white') }]}
                >
                  РНИС
                </Text>
                {item.check_rnis_tab_show != 0 ? (
                  <Image source={require('../../../assets/images/arrow_hide.png')} />
                ) : (
                  <Image source={require('../../../assets/images/arrow_show.png')} />
                )}
              </View>
            </TouchableHighlight>
          ) : (
            <View style={[styles.checkTab, { flex: 1, backgroundColor: getBgColor('white') }]}>
              <View style={styles.checkTabInner}>
                <Text numberOfLines={1} style={[styles.checkTabText, { color: '#3A3A3A', paddingRight: 5 }]}>
                  РНИС
                </Text>
                <ActivityIndicator size="small" color="#313131" animating={true} />
              </View>
            </View>
          )}
        </View>

        {/* Детали штрафов */}
        {item.check_fines_tab_show != 0 && !!item.check_fines_string && (
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
                {onOrderOsagoPolicy && (
                  <TouchableHighlight
                    style={styles.orderOsagoButton}
                    activeOpacity={0.8}
                    underlayColor="#3a7bd5"
                    onPress={() => onOrderOsagoPolicy(item)}
                  >
                    <Text style={styles.orderOsagoButtonText}>Заказать полис</Text>
                  </TouchableHighlight>
                )}
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
        {item.check_avtodor_tab_show != 0 && !!item.check_avtodor_string && (
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
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для React.memo
  // Рендерим заново только если изменились данные элемента, индекс или flag растягивания
  return (
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.fillHeight === nextProps.fillHeight
  );
});

AutoListItem.displayName = 'AutoListItem';

const styles = StyleSheet.create({
  passRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  passCell: {
    // Per-cell `flex` is set inline at the call site, proportional to
    // the longest realistic content of each column (icon 1, propusktype
    // 2, type 3, status 4 → total 10). `minHeight` instead of fixed
    // `height` so the cell can absorb an unexpected wrap without
    // breaking the row's vertical rhythm.
    alignItems: 'center',
    minHeight: 29,
    padding: 5,
    marginRight: 5,
    justifyContent: 'center',
  },
  passCellText: {
    // flexShrink + minWidth:0 let RN-Web apply text-overflow:ellipsis
    // when numberOfLines={1} is set on the Text inside the row-flex
    // parent. Without these, the Text refuses to shrink below content
    // width and overflows past the cell's right edge.
    flexShrink: 1,
    minWidth: 0,
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
    // `gap` replaces per-tab marginRight — no need to special-case the
    // last child and visual rhythm stays consistent when buttons are
    // added or removed from the row.
    gap: 6,
  },
  checkTab: {
    // Per-button `flex` is set inline at the call site, proportional to
    // label length (Row 1: «Штрафы» 7 vs «Платные дороги» 14 → flex 7
    // vs 14; Row 2: «ОСАГО»/«ДК»/«РНИС» → flex 1 each). Plain `flex: 1`
    // on Row 1 forced the longer label to wrap to a second visual line
    // on narrow cards (e.g. 4-column grid on 16-inch laptops).
    alignItems: 'center',
    minHeight: 29,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    borderRadius: 4,
  },
  checkTabInner: {
    // flexShrink lets the inner row collapse below its content size when
    // the parent button doesn't have enough room — the Text child can
    // then truncate via numberOfLines={1} instead of pushing the icon
    // past the right edge.
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  checkTabText: {
    // Same rationale: a Text inside a row-flex needs flexShrink:1 +
    // minWidth:0 for RN-Web to apply text-overflow:ellipsis when
    // numberOfLines={1} is set.
    flexShrink: 1,
    minWidth: 0,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  orderOsagoButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3A3A3A',
    borderRadius: 6,
  },
  orderOsagoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
