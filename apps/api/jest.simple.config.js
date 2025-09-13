module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/tests/whatsapp.service.simple.test.ts',
    '<rootDir>/src/tests/whatsapp.controller.simple.test.ts'
  ],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s'
  ],
  coverageDirectory: '../coverage',
  // Remove setupFilesAfterEnv to avoid setup.ts issues
  // setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true
}