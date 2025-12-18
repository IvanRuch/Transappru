import React from 'react';
import { SafeAreaInsetsContext, EdgeInsets } from 'react-native-safe-area-context';

/**
 * HOC для добавления SafeAreaInsets в классовые компоненты
 * Использование: export default withSafeAreaInsets(MyClassComponent);
 * В компоненте доступно через: this.props.insets
 */
export interface WithSafeAreaInsetsProps {
  insets: EdgeInsets;
}

export function withSafeAreaInsets<P extends WithSafeAreaInsetsProps>(
  Component: React.ComponentType<P>
) {
  const WithSafeAreaInsetsWrapper = (props: Omit<P, keyof WithSafeAreaInsetsProps>) => (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => <Component {...(props as P)} insets={insets!} />}
    </SafeAreaInsetsContext.Consumer>
  );
  
  WithSafeAreaInsetsWrapper.displayName = `withSafeAreaInsets(${Component.displayName || Component.name || 'Component'})`;
  
  return WithSafeAreaInsetsWrapper;
}
