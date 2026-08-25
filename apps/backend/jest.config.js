module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/api/**/*.spec.ts',
    '<rootDir>/src/application/**/*.spec.ts',
    '<rootDir>/src/auth/auth.service.spec.ts',
    '<rootDir>/src/auth/auth-audit.service.spec.ts',
    '<rootDir>/src/common/**/*.spec.ts',
    '<rootDir>/src/config/**/*.spec.ts',
    '<rootDir>/src/processes/homologation/**/*.spec.ts',
    '<rootDir>/src/processes/intern-workspace/**/*.spec.ts',
    '<rootDir>/src/processes/supervisor-evaluations/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@sadep/contracts$': '<rootDir>/../../packages/contracts/dist/index.js',
  },
};
