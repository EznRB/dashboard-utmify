/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Test directories
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|ts)',
    '<rootDir>/src/**/?(*.)(test|spec).(js|ts)',
    '<rootDir>/src/tests/**/*.(test|spec).(js|ts)',
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Transform files
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@prisma/(.*)$': '<rootDir>/prisma/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/**/__tests__/**/*',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/global-teardown.ts',
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  
  // Module paths
  modulePaths: ['<rootDir>/src'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$))',
  ],
  
  // Preset
  preset: 'ts-jest',
  
  // ESM support
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'esnext',
      },
    },
  },
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        suiteName: 'Utmify API Tests',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Bail on first test failure (for CI)
  bail: process.env.CI ? 1 : 0,
  
  // Test suites
  // Simplified configuration without projects for now
  // projects: [
  //   {
  //     displayName: 'unit',
  //     testMatch: ['<rootDir>/src/**/*.test.ts'],
  //     testPathIgnorePatterns: [
  //       '<rootDir>/src/tests/integration/**/*',
  //       '<rootDir>/src/tests/e2e/**/*',
  //     ],
  //   },
  //   {
  //     displayName: 'integration',
  //     testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/src/tests/integration-setup.ts'],
  //   },
  //   {
  //     displayName: 'e2e',
  //     testMatch: ['<rootDir>/src/tests/e2e/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/src/tests/e2e-setup.ts'],
  //   },
  // ],
};