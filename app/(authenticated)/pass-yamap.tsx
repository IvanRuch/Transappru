/**
 * Route wrapper for the mobile pass map. No synthetic navigation any more —
 * the screen uses expo-router directly. Re-exports the bridge utility for
 * callers (pass.tsx) that need to read the pending pick.
 */
import PassYaMapScreen from '../../src/screens/pass/PassYaMapScreen';

export { getPendingMapData } from '../../src/utils/passMapBridge';

export default PassYaMapScreen;
