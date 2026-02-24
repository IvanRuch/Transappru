import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

// On web, KeyboardAwareScrollView is not needed — a regular ScrollView suffices.
export function KeyboardAwareScrollView(props: ScrollViewProps & Record<string, any>) {
  const {
    enableOnAndroid,
    extraScrollHeight,
    enableAutomaticScroll,
    keyboardOpeningTime,
    ...scrollViewProps
  } = props;

  return <ScrollView {...scrollViewProps} />;
}
