import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/utmify_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Set timezone for consistent date testing
  process.env.TZ = 'UTC';
});

// Global test teardown
afterAll(async () => {
  // Clean up any global resources
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeEach(() => {
  // Mock console methods but allow them in debug mode
  if (process.env.DEBUG !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  }
});

afterEach(() => {
  // Restore console methods
  if (process.env.DEBUG !== 'true') {
    jest.restoreAllMocks();
  }
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
  
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidDate(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Mock external services by default
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    pipeline: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn(),
    dbsize: jest.fn(),
    flushdb: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
    zcard: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock Bull queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJobs: jest.fn(),
    clean: jest.fn(),
    getJobCounts: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock console for logging
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Test utilities
export const createMockUser = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  organizationId: '123e4567-e89b-12d3-a456-426614174001',
  email: 'test@example.com',
  name: 'Test User',
});

export const createMockCampaign = () => ({
  id: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Test Campaign',
  organizationId: '123e4567-e89b-12d3-a456-426614174001',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createMockMetrics = () => ({
  revenue: 5000,
  roas: 250,
  roi: 150,
  adSpend: 2000,
  cpc: 4,
  cpm: 200,
  cac: 40,
  impressions: 10000,
  clicks: 500,
  conversions: 50,
  ctr: 5,
  conversionRate: 10,
  ltv: 250,
  arpu: 100,
  margin: 60,
  profit: 3000,
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
  return mockDate;
};

export const restoreDate = () => {
  jest.restoreAllMocks();
};

// Database test utilities
export const createTestDatabase = async () => {
  // This would be implemented based on your database setup
  // For now, we'll just return a mock
  return {
    cleanup: async () => {},
    seed: async () => {},
  };
};

// Redis test utilities
export const createTestRedis = async () => {
  // This would be implemented based on your Redis setup
  return {
    cleanup: async () => {},
    flush: async () => {},
  };
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  
  return {
    result,
    duration,
  };
};

// Memory usage utilities
export const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
  };
};

// Async test utilities
export const expectAsync = async (promise: Promise<any>) => {
  try {
    const result = await promise;
    return expect(result);
  } catch (error) {
    return expect(error);
  }
};

// Mock factory for creating consistent test data
export class MockFactory {
  static createMetricsFilters(overrides: any = {}) {
    return {
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      ...overrides,
    };
  }
  
  static createKPIMetrics(overrides: any = {}) {
    return {
      ...createMockMetrics(),
      ...overrides,
    };
  }
  
  static createDashboardMetrics(overrides: any = {}) {
    const baseMetrics = createMockMetrics();
    return {
      summary: baseMetrics,
      trends: [
        { period: '2024-01-01', metrics: baseMetrics },
        { period: '2024-01-02', metrics: baseMetrics },
      ],
      topCampaigns: [
        {
          campaignId: '123e4567-e89b-12d3-a456-426614174002',
          campaignName: 'Test Campaign',
          metrics: baseMetrics,
        },
      ],
      alerts: [],
      ...overrides,
    };
  }
}

// Export test configuration
export const testConfig = {
  timeout: 30000,
  retries: 3,
  parallel: true,
  coverage: true,
  verbose: process.env.DEBUG === 'true',
};