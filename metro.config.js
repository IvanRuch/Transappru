const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the local mirror of Ivan's legacy backend (`legacy/`, ~9.8k
// third-party perl/static files copied for migration prep — see
// `.gitignore` + ADR-027/028). Nothing under it is imported by the app;
// letting Metro crawl/resolve it slows dev-server startup dramatically.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const legacyDir = escapeRegExp(path.join(__dirname, 'legacy'));
const legacyBlock = new RegExp(`^${legacyDir}[\\\\/].*$`);
const existingBlock = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlock)
    ? existingBlock
    : existingBlock
      ? [existingBlock]
      : []),
  legacyBlock,
];

module.exports = withNativeWind(config, { input: './global.css' });
