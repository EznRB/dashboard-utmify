import { createClient } from 'redis';
import { Client } from 'pg';
import { cleanupTestData } from './global-setup';

export default async function globalTeardown() {
  console.log('🧹 Tearing down test environment...');
  
  try {
    // Cleanup test data
    await cleanupTestData();
    
    // Cleanup Redis
    await cleanupTestRedis();
    
    // Close database connections
    await cleanupTestDatabase();
    
    console.log('✅ Test environment teardown complete');
  } catch (error) {
    console.error('❌ Failed to teardown test environment:', error);
    // Don't exit with error code in teardown
  }
}

async function cleanupTestRedis() {
  console.log('🔴 Cleaning up test Redis...');
  
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('⚠️ REDIS_URL not set, skipping Redis cleanup');
      return;
    }
    
    const client = createClient({ url: redisUrl });
    await client.connect();
    
    // Clear test Redis database
    await client.flushDb();
    
    await client.disconnect();
    
    console.log('✅ Test Redis cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not cleanup test Redis:', error.message);
  }
}

async function cleanupTestDatabase() {
  console.log('📊 Cleaning up test database connections...');
  
  try {
    // Force close any remaining connections
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️ DATABASE_URL not set, skipping database cleanup');
      return;
    }
    
    // Parse database URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1);
    
    // Connect to PostgreSQL admin database
    const adminClient = new Client({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: 'postgres',
    });
    
    await adminClient.connect();
    
    // Terminate active connections to test database
    try {
      await adminClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);
    } catch (error) {
      // Ignore errors when terminating connections
    }
    
    await adminClient.end();
    
    console.log('✅ Test database connections cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not cleanup test database:', error.message);
  }
}

// Utility function to force cleanup all resources
export async function forceCleanupAllResources() {
  console.log('🚨 Force cleaning up all test resources...');
  
  const cleanupPromises = [
    cleanupTestRedis().catch(err => console.warn('Redis cleanup failed:', err.message)),
    cleanupTestDatabase().catch(err => console.warn('Database cleanup failed:', err.message)),
    cleanupTestData().catch(err => console.warn('Data cleanup failed:', err.message)),
  ];
  
  await Promise.allSettled(cleanupPromises);
  
  console.log('✅ Force cleanup completed');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await forceCleanupAllResources();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await forceCleanupAllResources();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('\n💥 Uncaught exception:', error);
  await forceCleanupAllResources();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('\n💥 Unhandled rejection at:', promise, 'reason:', reason);
  await forceCleanupAllResources();
  process.exit(1);
});