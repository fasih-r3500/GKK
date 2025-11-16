module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      "nativewind/babel",       // Nativewind plugin
      "react-native-reanimated/plugin"  // Reanimated plugin
    ],
  };
};
