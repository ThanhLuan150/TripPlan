module.exports = api => {
  // Jest (NODE_ENV=test) reads '@env' from __mocks__/env.js instead: the dotenv plugin
  // does not cooperate with the coverage instrumentation.
  const test = api.env('test');
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: test
      ? []
      : [
          [
            'module:react-native-dotenv',
            {moduleName: '@env', path: '.env', safe: false, allowUndefined: true},
          ],
        ],
  };
};
