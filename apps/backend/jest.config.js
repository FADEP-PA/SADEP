module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/api/**/*.spec.ts',
    '<rootDir>/src/application/**/*.spec.ts',
    '<rootDir>/src/processes/supervisor-evaluations/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@aep-pa/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};
