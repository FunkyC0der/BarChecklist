module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/src/test/reanimated-mock.js',
  },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/database.generated.ts',
  ],
};
