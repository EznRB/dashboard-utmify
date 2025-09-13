import { FastifyInstance } from 'fastify'
import { config } from './env'

// Configurações de Rate Limiting por endpoint
export const rateLimitConfig = {
  // Autenticação - mais restritivo
  auth: {
    max: 5,
    timeWindow: '15 minutes',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      statusCode: 429
    })
  },
  
  // Registro de usuários
  register: {
    max: 3,
    timeWindow: '1 hour',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
      statusCode: 429
    })
  },
  
  // Reset de senha
  passwordReset: {
    max: 3,
    timeWindow: '1 hour',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de reset de senha. Tente novamente em 1 hora.',
      statusCode: 429
    })
  },
  
  // APIs gerais
  general: {
    max: config.NODE_ENV === 'production' ? 1000 : 10000,
    timeWindow: '1 hour',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Limite de requisições excedido. Tente novamente mais tarde.',
      statusCode: 429
    })
  },
  
  // Upload de arquivos
  upload: {
    max: 50,
    timeWindow: '1 hour',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Muitos uploads realizados. Tente novamente em 1 hora.',
      statusCode: 429
    })
  }
}

// Configurações do Helmet para headers de segurança
export const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      ...(config.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // Outras configurações de segurança
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Remover header X-Powered-By
  hidePoweredBy: true,
  
  // Configurações específicas para produção
  ...(config.NODE_ENV === 'production' && {
    forceHTTPS: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
}

// Configurações CORS específicas para produção
export const corsConfig = {
  origin: config.NODE_ENV === 'production' 
    ? [
        'https://utmify.com',
        'https://www.utmify.com',
        'https://app.utmify.com'
      ]
    : true, // Permite qualquer origem em desenvolvimento
  
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 horas
}

// Lista de IPs bloqueados (pode ser expandida)
export const blockedIPs = new Set([
  // Adicionar IPs maliciosos conhecidos
])

// Configuração de validação de input
export const inputValidation = {
  // Tamanho máximo do payload (10MB)
  maxPayloadSize: 10 * 1024 * 1024,
  
  // Caracteres perigosos para detectar
  dangerousPatterns: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi
  ],
  
  // Extensões de arquivo permitidas
  allowedFileExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.txt', '.csv', '.zip'
  ],
  
  // Tipos MIME permitidos
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'application/zip'
  ]
}

// Função para registrar plugins de segurança
export async function registerSecurityPlugins(app: FastifyInstance) {
  // Registrar Helmet para headers de segurança
  await app.register(require('@fastify/helmet'), helmetConfig)
  
  // Registrar Rate Limiting global
  await app.register(require('@fastify/rate-limit'), {
    global: true,
    ...rateLimitConfig.general,
    keyGenerator: (request) => {
      // Usar IP + User-Agent para identificação única
      const ip = request.ip
      const userAgent = request.headers['user-agent'] || 'unknown'
      return `${ip}-${Buffer.from(userAgent).toString('base64').slice(0, 10)}`
    },
    skipOnError: false,
    skipSuccessfulRequests: false,
    
    // Hook para logging de rate limiting
    onExceeding: (request) => {
      app.log.warn({
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
        method: request.method
      }, 'Rate limit approaching for request')
    },
    
    onExceeded: (request) => {
      app.log.error({
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
        method: request.method
      }, 'Rate limit exceeded for request')
    }
  })
  
  // Hook para validação de input e segurança
  app.addHook('preHandler', async (request, reply) => {
    // Verificar IPs bloqueados
    if (blockedIPs.has(request.ip)) {
      app.log.error({ ip: request.ip }, 'Blocked IP attempted access')
      reply.code(403).send({ error: 'Access Denied', message: 'Seu IP foi bloqueado.' })
      return
    }
    
    // Validar tamanho do payload
    const contentLength = request.headers['content-length']
    if (contentLength && parseInt(contentLength) > inputValidation.maxPayloadSize) {
      app.log.warn({ 
        ip: request.ip, 
        contentLength,
        url: request.url 
      }, 'Payload too large')
      reply.code(413).send({ 
        error: 'Payload Too Large', 
        message: 'O tamanho da requisição excede o limite permitido.' 
      })
      return
    }
    
    // Log de requisições suspeitas
    const userAgent = request.headers['user-agent'] || ''
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ]
    
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      app.log.info({
        ip: request.ip,
        userAgent,
        url: request.url,
        method: request.method
      }, 'Suspicious user agent detected')
    }
  })
  
  // Hook para sanitização de response
  app.addHook('preSerialization', async (request, reply, payload) => {
    // Remover informações sensíveis dos erros em produção
    if (config.NODE_ENV === 'production' && payload && typeof payload === 'object') {
      if (payload.error && payload.stack) {
        delete payload.stack
      }
      if (payload.error && payload.validation) {
        // Sanitizar mensagens de validação
        payload.validation = payload.validation.map((v: any) => ({
          field: v.instancePath || v.field,
          message: 'Valor inválido fornecido'
        }))
      }
    }
    return payload
  })
  
  app.log.info('Security plugins registered successfully')
}

// Função para aplicar rate limiting específico em rotas
export function applyRouteRateLimit(app: FastifyInstance, routePrefix: string, config: any) {
  app.register(async function (fastify) {
    await fastify.register(require('@fastify/rate-limit'), {
      ...config,
      keyGenerator: (request) => `${routePrefix}-${request.ip}`
    })
  }, { prefix: routePrefix })
}

// Configurações de monitoramento de segurança
export const securityMetrics = {
  // Eventos para monitorar
  events: {
    FAILED_LOGIN: 'security.failed_login',
    RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
    SUSPICIOUS_REQUEST: 'security.suspicious_request',
    BLOCKED_IP: 'security.blocked_ip',
    INVALID_TOKEN: 'security.invalid_token',
    PRIVILEGE_ESCALATION: 'security.privilege_escalation'
  },
  
  // Thresholds para alertas
  thresholds: {
    failedLoginsPerHour: 50,
    rateLimitExceededPerHour: 100,
    suspiciousRequestsPerHour: 200
  }
}