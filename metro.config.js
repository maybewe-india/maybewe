const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-worklets has no web implementation — point Metro at the
// bundleMode shim so the web bundle doesn't throw UnableToResolveError.
const workletsWebShim = path.resolve(
  __dirname,
  'node_modules/react-native-worklets/bundleMode/index.js'
);

config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-worklets') {
    return {
      filePath: workletsWebShim,
      type: 'sourceFile',
    };
  }
  // Fall back to default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
