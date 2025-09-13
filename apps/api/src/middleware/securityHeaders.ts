import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { addBreadcrumb } from '@sentry/node';

// Security headers configuration
interface SecurityHeadersConfig {
  contentSecurityPolicy?: {
    directives: Record<string, string | string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string[]>;
  crossOriginEmbedderPolicy?: 'require-corp' | 'credentialless';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
}

// Default security configuration for Utmify
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  // Content Security Policy - prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for some analytics
        "'unsafe-eval'", // Required for some frameworks (use carefully)
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        'https://connect.facebook.net',
        'https://www.facebook.com',
        'https://static.ads-twitter.com',
        'https://analytics.twitter.com',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      'img-src': [
        "'self'",
        'data:', // For base64 images
        'blob:', // For generated images
        'https:', // Allow HTTPS images
        'https://www.google-analytics.com',
        'https://www.facebook.com',
        'https://px.ads.linkedin.com',
        'https://t.co',
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
        'data:', // For base64 fonts
      ],
      'connect-src': [
        "'self'",
        'https://api.utmify.com', // Your API domain
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://stats.g.doubleclick.net',
        'https://www.facebook.com',
        'https://graph.facebook.com',
        'https://api.twitter.com',
        'https://api.linkedin.com',
        'https://sentry.io', // For error reporting
        'wss:', // WebSocket connections
      ],
      'frame-src': [
        "'self'",
        'https://www.youtube.com',
        'https://player.vimeo.com',
        'https://www.facebook.com',
        'https://web.facebook.com',
      ],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'", 'blob:'],
      'object-src': ["'none'"], // Prevent Flash/Java applets
      'base-uri': ["'self'"], // Prevent base tag injection
      'form-action': ["'self'"], // Restrict form submissions
      'frame-ancestors': ["'none'"], // Prevent clickjacking
      'upgrade-insecure-requests': [], // Upgrade HTTP to HTTPS
    },
    reportOnly: false,
    reportUri: '/api/csp-report',
  },
  
  // HTTP Strict Transport Security - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options - prevent clickjacking
  frameOptions: 'DENY',
  
  // X-Content-Type-Options - prevent MIME sniffing
  contentTypeOptions: true,
  
  // Referrer-Policy - control referrer information
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions-Policy - control browser features
  permissionsPolicy: {
    'accelerometer': [],
    'ambient-light-sensor': [],
    'autoplay': ['self'],
    'battery': [],
    'camera': [],
    'cross-origin-isolated': [],
    'display-capture': [],
    'document-domain': [],
    'encrypted-media': [],
    'execution-while-not-rendered': [],
    'execution-while-out-of-viewport': [],
    'fullscreen': ['self'],
    'geolocation': [],
    'gyroscope': [],
    'keyboard-map': [],
    'magnetometer': [],
    'microphone': [],
    'midi': [],
    'navigation-override': [],
    'payment': ['self'],
    'picture-in-picture': [],
    'publickey-credentials-get': [],
    'screen-wake-lock': [],
    'sync-xhr': [],
    'usb': [],
    'web-share': ['self'],
    'xr-spatial-tracking': [],
  },
  
  // Cross-Origin policies
  crossOriginEmbedderPolicy: 'credentialless',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'cross-origin',
};

// Development configuration (more permissive)
const DEVELOPMENT_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_CONFIG,
  contentSecurityPolicy: {
    ...DEFAULT_CONFIG.contentSecurityPolicy!,
    directives: {
      ...DEFAULT_CONFIG.contentSecurityPolicy!.directives,
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'localhost:*',
        '127.0.0.1:*',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      'connect-src': [
        "'self'",
        'localhost:*',
        '127.0.0.1:*',
        'ws://localhost:*',
        'wss://localhost:*',
        'https://api.utmify.com',
        'https://sentry.io',
      ],
    },
    reportOnly: true, // Don't block in development
  },
  hsts: undefined, // Don't enforce HTTPS in development
};

class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private isDevelopment: boolean;
  
  constructor(config?: Partial<SecurityHeadersConfig>, isDevelopment = false) {
    this.isDevelopment = isDevelopment;
    const baseConfig = isDevelopment ? DEVELOPMENT_CONFIG : DEFAULT_CONFIG;
    this.config = { ...baseConfig, ...config };
  }
  
  // Generate CSP header value
  private generateCSPHeader(): string {
    if (!this.config.contentSecurityPolicy) return '';
    
    const { directives } = this.config.contentSecurityPolicy;
    const cspParts: string[] = [];
    
    for (const [directive, sources] of Object.entries(directives)) {
      if (Array.isArray(sources) && sources.length > 0) {
        cspParts.push(`${directive} ${sources.join(' ')}`);
      } else if (sources === true || (Array.isArray(sources) && sources.length === 0)) {
        cspParts.push(directive);
      }
    }
    
    return cspParts.join('; ');
  }
  
  // Generate Permissions Policy header value
  private generatePermissionsPolicyHeader(): string {
    if (!this.config.permissionsPolicy) return '';
    
    const policies: string[] = [];
    
    for (const [feature, allowlist] of Object.entries(this.config.permissionsPolicy)) {
      if (allowlist.length === 0) {
        policies.push(`${feature}=()`);
      } else {
        const origins = allowlist.map(origin => 
          origin === 'self' ? 'self' : `"${origin}"`
        ).join(' ');
        policies.push(`${feature}=(${origins})`);
      }
    }
    
    return policies.join(', ');
  }
  
  // Apply security headers to response
  applyHeaders(reply: FastifyReply): void {
    try {
      // Content Security Policy
      if (this.config.contentSecurityPolicy) {
        const cspHeader = this.generateCSPHeader();
        if (cspHeader) {
          const headerName = this.config.contentSecurityPolicy.reportOnly 
            ? 'Content-Security-Policy-Report-Only'
            : 'Content-Security-Policy';
          reply.header(headerName, cspHeader);
        }
      }
      
      // HTTP Strict Transport Security
      if (this.config.hsts && !this.isDevelopment) {
        const { maxAge, includeSubDomains, preload } = this.config.hsts;
        let hstsValue = `max-age=${maxAge}`;
        if (includeSubDomains) hstsValue += '; includeSubDomains';
        if (preload) hstsValue += '; preload';
        reply.header('Strict-Transport-Security', hstsValue);
      }
      
      // X-Frame-Options
      if (this.config.frameOptions) {
        reply.header('X-Frame-Options', this.config.frameOptions);
      }
      
      // X-Content-Type-Options
      if (this.config.contentTypeOptions) {
        reply.header('X-Content-Type-Options', 'nosniff');
      }
      
      // Referrer-Policy
      if (this.config.referrerPolicy) {
        reply.header('Referrer-Policy', this.config.referrerPolicy);
      }
      
      // Permissions-Policy
      if (this.config.permissionsPolicy) {
        const permissionsHeader = this.generatePermissionsPolicyHeader();
        if (permissionsHeader) {
          reply.header('Permissions-Policy', permissionsHeader);
        }
      }
      
      // Cross-Origin policies
      if (this.config.crossOriginEmbedderPolicy) {
        reply.header('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy);
      }
      
      if (this.config.crossOriginOpenerPolicy) {
        reply.header('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy);
      }
      
      if (this.config.crossOriginResourcePolicy) {
        reply.header('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy);
      }
      
      // Additional security headers
      reply.header('X-DNS-Prefetch-Control', 'off');
      reply.header('X-Download-Options', 'noopen');
      reply.header('X-Permitted-Cross-Domain-Policies', 'none');
      reply.header('X-XSS-Protection', '0'); // Disabled as CSP is more effective
      
      // Remove server information
      reply.removeHeader('Server');
      reply.removeHeader('X-Powered-By');
      
    } catch (error) {
      // Log error but don't fail the request
      addBreadcrumb({
        category: 'security',
        message: 'Failed to apply security headers',
        data: { error: error.message },
        level: 'error',
      });
    }
  }
  
  // Create middleware function
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      this.applyHeaders(reply);
    };
  }
}

// CSP violation reporting endpoint
export async function cspReportHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const report = request.body as any;
    
    // Log CSP violation
    addBreadcrumb({
      category: 'security',
      message: 'CSP violation reported',
      data: {
        'blocked-uri': report['csp-report']?.['blocked-uri'],
        'violated-directive': report['csp-report']?.['violated-directive'],
        'original-policy': report['csp-report']?.['original-policy'],
        'document-uri': report['csp-report']?.['document-uri'],
        'referrer': report['csp-report']?.['referrer'],
        'user-agent': request.headers['user-agent'],
        'ip': request.ip,
      },
      level: 'warning',
    });
    
    // You might want to store these reports in a database for analysis
    // await storeCSPViolation(report);
    
    reply.code(204).send();
  } catch (error) {
    reply.code(400).send({ error: 'Invalid CSP report' });
  }
}

// Plugin to register security headers middleware
export async function securityHeadersPlugin(fastify: FastifyInstance, options: {
  config?: Partial<SecurityHeadersConfig>;
  isDevelopment?: boolean;
} = {}) {
  const { config, isDevelopment = process.env.NODE_ENV === 'development' } = options;
  
  const securityHeaders = new SecurityHeaders(config, isDevelopment);
  
  // Apply security headers to all responses
  fastify.addHook('onSend', async (request, reply) => {
    securityHeaders.applyHeaders(reply);
  });
  
  // Register CSP report endpoint
  fastify.post('/api/csp-report', {
    schema: {
      body: {
        type: 'object',
        properties: {
          'csp-report': {
            type: 'object',
            properties: {
              'blocked-uri': { type: 'string' },
              'violated-directive': { type: 'string' },
              'original-policy': { type: 'string' },
              'document-uri': { type: 'string' },
              'referrer': { type: 'string' },
            },
          },
        },
      },
    },
  }, cspReportHandler);
  
  // Utility function to get current CSP
  fastify.decorate('getCSPHeader', () => {
    return securityHeaders['generateCSPHeader']();
  });
  
  // Utility function to temporarily modify CSP for specific routes
  fastify.decorate('withCustomCSP', (customDirectives: Record<string, string[]>) => {
    return (request: FastifyRequest, reply: FastifyReply) => {
      const customHeaders = new SecurityHeaders({
        contentSecurityPolicy: {
          directives: {
            ...DEFAULT_CONFIG.contentSecurityPolicy!.directives,
            ...customDirectives,
          },
        },
      }, isDevelopment);
      
      customHeaders.applyHeaders(reply);
    };
  });
}

// Utility function to validate CSP directives
export function validateCSPDirectives(directives: Record<string, string[]>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
    'connect-src', 'frame-src', 'worker-src', 'child-src', 'object-src',
    'base-uri', 'form-action', 'frame-ancestors', 'upgrade-insecure-requests',
    'block-all-mixed-content', 'require-sri-for', 'sandbox',
  ];
  
  for (const directive of Object.keys(directives)) {
    if (!validDirectives.includes(directive)) {
      errors.push(`Invalid CSP directive: ${directive}`);
    }
  }
  
  // Check for unsafe directives in production
  if (process.env.NODE_ENV === 'production') {
    const unsafeDirectives = ['unsafe-inline', 'unsafe-eval', 'unsafe-hashes'];
    
    for (const [directive, sources] of Object.entries(directives)) {
      if (Array.isArray(sources)) {
        for (const source of sources) {
          if (unsafeDirectives.some(unsafe => source.includes(unsafe))) {
            errors.push(`Unsafe CSP source in production: ${source} in ${directive}`);
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export configurations and classes
export { SecurityHeaders, DEFAULT_CONFIG, DEVELOPMENT_CONFIG };
export type { SecurityHeadersConfig };
export default securityHeadersPlugin;