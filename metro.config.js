const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./apps/mobile/global.css",
  dtsFile: "./apps/mobile/uniwind-types.d.ts",
});
