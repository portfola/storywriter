module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-class-static-block', // ✅ AWS SDK support

      ['module-resolver', {
        root: ['.'],
        alias: {
          '@': '.',
          '@env': './.env',
        },
      }],

      'module:react-native-dotenv' // ✅ Environment variables
    ],
  };
};
