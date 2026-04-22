/**
 * alert.ts — mobile variant delegates to Alert.alert.
 */
import { showAlert } from '../alert';
import { Alert } from 'react-native';

describe('showAlert (mobile)', () => {
  beforeEach(() => {
    (Alert.alert as jest.Mock).mockClear();
  });

  it('passes title and message to Alert.alert', () => {
    showAlert('Error', 'Something went wrong');
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong');
  });

  it('passes just title when no message', () => {
    showAlert('Notice');
    expect(Alert.alert).toHaveBeenCalledWith('Notice', undefined);
  });
});
