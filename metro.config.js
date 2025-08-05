// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
};

module.exports = config;