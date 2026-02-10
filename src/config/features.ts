// Конфигурация функциональных флагов (Feature Flags)

// Включить оплату штрафов в релизной сборке
export const ENABLE_PAYMENT_IN_RELEASE = false;

// Показывать UI оплаты (кнопки, чекбоксы)
// В разработке (__DEV__) всегда показываем, в релизе - зависит от флага
export const SHOW_PAYMENT_UI = __DEV__ || ENABLE_PAYMENT_IN_RELEASE;
// export const SHOW_PAYMENT_UI = false
