import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { reportError, reportMessage, addBreadcrumb } from './sentry';

// Monitoring configuration
interface MonitoringConfig {
  metricsInterval: number; // milliseconds
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  retentionPeriod: number; // milliseconds
}

const DEFAULT_CONFIG: MonitoringConfig = {
  metricsInterval: 30000, // 30 seconds
  alertThresholds: {
    cpuUsage: 80, // percentage
    memoryUsage: 85, // percentage
    responseTime: 5000, // milliseconds
    errorRate: 5, // percentage
    activeConnections: 1000,
  },
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
};

// Metric types
interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    usage: number;
    free: number;
    total: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

interface ApplicationMetrics {
  timestamp: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
  database: {
    connections: number;
    queries: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
}

interface BusinessMetrics {
  timestamp: number;
  users: {
    active: number;
    new: number;
    returning: number;
  };
  utm: {
    created: number;
    clicked: number;
    conversionRate: number;
  };
  campaigns: {
    active: number;
    paused: number;
    completed: number;
  };
  revenue: {
    total: number;
    subscriptions: number;
    upgrades: number;
  };
}

// Monitoring class
class SystemMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private isRunning = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private businessMetrics: BusinessMetrics[] = [];
  private requestStats = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [] as number[],
    lastReset: Date.now(),
  };
  private errorStats = {
    total: 0,
    byType: {} as Record<string, number>,
    lastReset: Date.now(),
  };
  private databaseStats = {
    queries: 0,
    queryTimes: [] as number[],
    slowQueries: 0,
    lastReset: Date.now(),
  };
  private cacheStats = {
    hits: 0,
    misses: 0,
    lastReset: Date.now(),
  };

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    addBreadcrumb('System monitoring started', 'monitoring');
    reportMessage('System monitoring started', 'info');
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    addBreadcrumb('System monitoring stopped', 'monitoring');
    reportMessage('System monitoring stopped', 'info');
  }

  private async collectMetrics() {
    try {
      const timestamp = Date.now();

      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics(timestamp);
      this.systemMetrics.push(systemMetrics);

      // Collect application metrics
      const applicationMetrics = this.collectApplicationMetrics(timestamp);
      this.applicationMetrics.push(applicationMetrics);

      // Collect business metrics
      const businessMetrics = await this.collectBusinessMetrics(timestamp);
      this.businessMetrics.push(businessMetrics);

      // Check for alerts
      this.checkAlerts(systemMetrics, applicationMetrics);

      // Clean up old metrics
      this.cleanupOldMetrics();

      // Emit metrics event
      this.emit('metrics', {
        system: systemMetrics,
        application: applicationMetrics,
        business: businessMetrics,
      });
    } catch (error) {
      reportError(error as Error, { context: 'metrics_collection' });
    }
  }

  private async collectSystemMetrics(timestamp: number): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get system information (would need additional libraries for full system metrics)
    return {
      timestamp,
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: [0, 0, 0], // Would use os.loadavg() in Node.js
      },
      memory: {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.heapTotal,
        usage: (memUsage.rss / (memUsage.rss + memUsage.heapTotal)) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      },
      disk: {
        usage: 0, // Would need fs.statSync() or similar
        free: 0,
        total: 0,
      },
      network: {
        bytesIn: 0, // Would need network monitoring
        bytesOut: 0,
      },
    };
  }

  private collectApplicationMetrics(timestamp: number): ApplicationMetrics {
    const now = Date.now();
    const timeSinceReset = now - this.requestStats.lastReset;
    const requestsPerSecond = this.requestStats.total / (timeSinceReset / 1000);
    const averageResponseTime = this.requestStats.responseTimes.length > 0
      ? this.requestStats.responseTimes.reduce((a, b) => a + b, 0) / this.requestStats.responseTimes.length
      : 0;
    const errorRate = this.requestStats.total > 0
      ? (this.errorStats.total / this.requestStats.total) * 100
      : 0;
    const averageQueryTime = this.databaseStats.queryTimes.length > 0
      ? this.databaseStats.queryTimes.reduce((a, b) => a + b, 0) / this.databaseStats.queryTimes.length
      : 0;
    const cacheHitRate = (this.cacheStats.hits + this.cacheStats.misses) > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
      : 0;

    return {
      timestamp,
      requests: {
        total: this.requestStats.total,
        successful: this.requestStats.successful,
        failed: this.requestStats.failed,
        averageResponseTime,
        requestsPerSecond,
      },
      database: {
        connections: 0, // Would get from database pool
        queries: this.databaseStats.queries,
        averageQueryTime,
        slowQueries: this.databaseStats.slowQueries,
      },
      cache: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: cacheHitRate,
      },
      errors: {
        total: this.errorStats.total,
        rate: errorRate,
        byType: { ...this.errorStats.byType },
      },
    };
  }

  private async collectBusinessMetrics(timestamp: number): Promise<BusinessMetrics> {
    // This would typically query your database for business metrics
    // Placeholder implementation
    return {
      timestamp,
      users: {
        active: 0,
        new: 0,
        returning: 0,
      },
      utm: {
        created: 0,
        clicked: 0,
        conversionRate: 0,
      },
      campaigns: {
        active: 0,
        paused: 0,
        completed: 0,
      },
      revenue: {
        total: 0,
        subscriptions: 0,
        upgrades: 0,
      },
    };
  }

  private checkAlerts(systemMetrics: SystemMetrics, applicationMetrics: ApplicationMetrics) {
    const alerts: string[] = [];

    // Check system alerts
    if (systemMetrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
      alerts.push(`High CPU usage: ${systemMetrics.cpu.usage.toFixed(2)}%`);
    }

    if (systemMetrics.memory.usage > this.config.alertThresholds.memoryUsage) {
      alerts.push(`High memory usage: ${systemMetrics.memory.usage.toFixed(2)}%`);
    }

    // Check application alerts
    if (applicationMetrics.requests.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push(`High response time: ${applicationMetrics.requests.averageResponseTime.toFixed(2)}ms`);
    }

    if (applicationMetrics.errors.rate > this.config.alertThresholds.errorRate) {
      alerts.push(`High error rate: ${applicationMetrics.errors.rate.toFixed(2)}%`);
    }

    // Send alerts
    if (alerts.length > 0) {
      this.emit('alert', {
        timestamp: Date.now(),
        alerts,
        systemMetrics,
        applicationMetrics,
      });

      reportMessage(`System alerts: ${alerts.join(', ')}`, 'warning');
    }
  }

  private cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod;

    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
    this.applicationMetrics = this.applicationMetrics.filter(m => m.timestamp > cutoff);
    this.businessMetrics = this.businessMetrics.filter(m => m.timestamp > cutoff);
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    // In a real implementation, you'd track this over time
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage
  }

  // Public methods for tracking application events
  trackRequest(responseTime: number, success: boolean) {
    this.requestStats.total++;
    this.requestStats.responseTimes.push(responseTime);
    
    if (success) {
      this.requestStats.successful++;
    } else {
      this.requestStats.failed++;
    }

    // Keep only recent response times
    if (this.requestStats.responseTimes.length > 1000) {
      this.requestStats.responseTimes = this.requestStats.responseTimes.slice(-500);
    }
  }

  trackError(error: Error, type?: string) {
    this.errorStats.total++;
    const errorType = type || error.constructor.name;
    this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;
  }

  trackDatabaseQuery(queryTime: number, slow: boolean = false) {
    this.databaseStats.queries++;
    this.databaseStats.queryTimes.push(queryTime);
    
    if (slow) {
      this.databaseStats.slowQueries++;
    }

    // Keep only recent query times
    if (this.databaseStats.queryTimes.length > 1000) {
      this.databaseStats.queryTimes = this.databaseStats.queryTimes.slice(-500);
    }
  }

  trackCacheHit() {
    this.cacheStats.hits++;
  }

  trackCacheMiss() {
    this.cacheStats.misses++;
  }

  // Getters for current metrics
  getSystemMetrics(limit: number = 100): SystemMetrics[] {
    return this.systemMetrics.slice(-limit);
  }

  getApplicationMetrics(limit: number = 100): ApplicationMetrics[] {
    return this.applicationMetrics.slice(-limit);
  }

  getBusinessMetrics(limit: number = 100): BusinessMetrics[] {
    return this.businessMetrics.slice(-limit);
  }

  getCurrentStats() {
    return {
      requests: { ...this.requestStats },
      errors: { ...this.errorStats },
      database: { ...this.databaseStats },
      cache: { ...this.cacheStats },
    };
  }

  resetStats() {
    const now = Date.now();
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
      lastReset: now,
    };
    this.errorStats = {
      total: 0,
      byType: {},
      lastReset: now,
    };
    this.databaseStats = {
      queries: 0,
      queryTimes: [],
      slowQueries: 0,
      lastReset: now,
    };
    this.cacheStats = {
      hits: 0,
      misses: 0,
      lastReset: now,
    };
  }
}

// Create singleton instance
const monitor = new SystemMonitor();

export default monitor;
export { SystemMonitor, SystemMetrics, ApplicationMetrics, BusinessMetrics };

// Convenience functions
export const startMonitoring = (config?: Partial<MonitoringConfig>) => {
  if (config) {
    // Create new instance with custom config
    const customMonitor = new SystemMonitor(config);
    customMonitor.start();
    return customMonitor;
  }
  monitor.start();
  return monitor;
};

export const stopMonitoring = () => {
  monitor.stop();
};

export const trackRequest = (responseTime: number, success: boolean) => {
  monitor.trackRequest(responseTime, success);
};

export const trackError = (error: Error, type?: string) => {
  monitor.trackError(error, type);
};

export const trackDatabaseQuery = (queryTime: number, slow?: boolean) => {
  monitor.trackDatabaseQuery(queryTime, slow);
};

export const trackCacheHit = () => {
  monitor.trackCacheHit();
};

export const trackCacheMiss = () => {
  monitor.trackCacheMiss();
};