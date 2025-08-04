// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
};

// Add resolver configuration for ES modules compatibility
config.resolver.unstable_enablePackageExports = false;
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require'];

module.exports = config;