import PassYaMapScreen from '../../src/screens/pass/PassYaMapScreen';

// Re-export the screen component. getPendingMapData is not needed on web —
// map data is transferred via navigation params (address_map_data).
export function getPendingMapData() {
  return null;
}

export default PassYaMapScreen;
