import DeviceInfo from 'react-native-device-info';
import packageJson from '../../package.json';

const Version = packageJson.version;

export const getDeviceInfo = () => {
  const getDeviceId = DeviceInfo.getDeviceId();
  const deviceModel = DeviceInfo.getModel();
  const systemName = DeviceInfo.getSystemName();
  const systemVersion = DeviceInfo.getSystemVersion();

  const device_info = `Version: ${Version}, Device Id: ${getDeviceId}, Device Model: ${deviceModel}, OS: ${systemName} ${systemVersion}`;
  console.log('📱 [Device] Info compiled:', device_info);

  return device_info;
};