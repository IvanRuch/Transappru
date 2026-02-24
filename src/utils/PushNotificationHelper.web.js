import packageJson from '../../package.json';

const Version = packageJson.version;

export const getDeviceInfo = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const device_info = `Version: ${Version}, Web Browser: ${userAgent}`;
  console.log('[Device Web] Info compiled:', device_info);
  return device_info;
};
