const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for expo-dev-client
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;