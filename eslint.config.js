// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // This app does not enable the React Compiler (app.json sets reactCompiler to false),
      // so the compiler oriented react-hooks rules stay advisory instead of blocking.
      // The rule flags the data loading effects in this app because they update state after
      // awaiting Supabase, which the analysis cannot tell apart from a synchronous setState.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
