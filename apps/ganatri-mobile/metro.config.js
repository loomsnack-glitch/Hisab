// Learn more: https://docs.expo.dev/guides/monorepos/
// Expo auto-configures Metro for monorepos (watchFolders / nodeModulesPaths),
// so we only layer NativeWind on top of the default config.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/global.css' });
