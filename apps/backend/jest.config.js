module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/api/**/*.spec.ts',
    '<rootDir>/src/application/**/*.spec.ts',
    '<rootDir>/src/processes/supervisor-evaluations/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@aep-pa/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};
