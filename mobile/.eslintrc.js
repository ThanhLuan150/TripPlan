module.exports = {
  root: true,
  extends: '@react-native',
  // jest globals in the test setup and the tests
  overrides: [{files: ['jest.setup.js', '__tests__/**'], env: {jest: true}}],
  rules: {
    // React 17+ JSX transform: no need to import React in every file
    'react/react-in-jsx-scope': 'off',
  },
};
