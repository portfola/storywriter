module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            "@env": "./.env", // ✅ Explicitly add @env alias
          },
        },
      ],
      "module:react-native-dotenv",
    ],
  };
}