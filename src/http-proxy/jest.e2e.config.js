module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage/e2e',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts']
};
