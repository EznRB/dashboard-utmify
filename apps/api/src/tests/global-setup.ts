import { execSync } from 'child_process';
import { createClient } from 'redis';
import { Client } from 'pg';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/utmify_test';
    process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
    process.env.LOG_LEVEL = 'error';
    
    // Setup test database
    await setupTestDatabase();
    
    // Setup test Redis
    await setupTestRedis();
    
    // Run database migrations
    await runDatabaseMigrations();
    
    // Install stored procedures
    await installStoredProcedures();
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set');
  }
  
  try {
    // Parse database URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1);
    
    // Connect to PostgreSQL (without specific database)
    const adminClient = new Client({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: 'postgres', // Connect to default database
    });
    
    await adminClient.connect();
    
    // Drop test database if exists
    try {
      await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } catch (error) {
      // Ignore error if database doesn't exist
    }
    
    // Create test database
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    
    await adminClient.end();
    
    console.log('✅ Test database created successfully');
  } catch (error) {
    console.warn('⚠️ Could not setup test database (may already exist):', error.message);
  }
}

async function setupTestRedis() {
  console.log('🔴 Setting up test Redis...');
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('TEST_REDIS_URL is not set');
  }
  
  try {
    const client = createClient({ url: redisUrl });
    await client.connect();
    
    // Clear test Redis database
    await client.flushDb();
    
    await client.disconnect();
    
    console.log('✅ Test Redis setup complete');
  } catch (error) {
    console.warn('⚠️ Could not setup test Redis:', error.message);
  }
}

async function runDatabaseMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });
    
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.warn('⚠️ Could not run migrations:', error.message);
  }
}

async function installStoredProcedures() {
  console.log('🔧 Installing stored procedures...');
  
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    // Read and execute stored procedures SQL
    const fs = require('fs');
    const path = require('path');
    
    const sqlPath = path.join(__dirname, '../../prisma/migrations/001_create_metrics_procedures.sql');
    
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('✅ Stored procedures installed');
    } else {
      console.warn('⚠️ Stored procedures SQL file not found');
    }
    
    await client.end();
  } catch (error) {
    console.warn('⚠️ Could not install stored procedures:', error.message);
  }
}

// Health check functions
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (error) {
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    await client.ping();
    await client.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}

// Utility functions for tests
export async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Create test organization
    const organization = await prisma.organization.upsert({
      where: { id: '123e4567-e89b-12d3-a456-426614174001' },
      update: {},
      create: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Create test user
    const user = await prisma.user.upsert({
      where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      update: {},
      create: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: organization.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Create test campaign
    const campaign = await prisma.campaign.upsert({
      where: { id: '123e4567-e89b-12d3-a456-426614174002' },
      update: {},
      create: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Test Campaign',
        organizationId: organization.id,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Create test metrics data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.metricsDaily.upsert({
      where: {
        campaignId_date: {
          campaignId: campaign.id,
          date: today,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        date: today,
        impressions: 10000,
        clicks: 500,
        conversions: 50,
        revenue: 5000,
        adSpend: 2000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    await prisma.$disconnect();
    
    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.warn('⚠️ Could not seed test data:', error.message);
  }
}

export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Delete in reverse order of dependencies
    await prisma.metricsDaily.deleteMany({});
    await prisma.metricsHourly.deleteMany({});
    await prisma.conversionEvent.deleteMany({});
    await prisma.funnelStage.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});
    
    await prisma.$disconnect();
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not cleanup test data:', error.message);
  }
}

// Export configuration
export const testEnvironmentConfig = {
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: 10,
    timeout: 30000,
  },
  redis: {
    url: process.env.REDIS_URL,
    maxRetries: 3,
    timeout: 5000,
  },
  api: {
    port: process.env.TEST_PORT || 3001,
    timeout: 30000,
  },
};