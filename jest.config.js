module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/global\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@unimodules|unimodules|@sentry|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-native-community)',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};
