module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {'^@env$': '<rootDir>/__mocks__/env.js'},
  // not tests: helpers shared by the spec files
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/assets/**',
    // re-exports without logic
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  // CI fails below these numbers
  coverageThreshold: {
    global: {statements: 95, branches: 95, functions: 95, lines: 95},
  },
};
