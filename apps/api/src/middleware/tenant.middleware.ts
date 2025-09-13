import { FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../utils/logger'

export interface TenantInfo {
  id: string
  slug: string
  name: string
  planType: string
  isActive: boolean
  schema: string
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantInfo
  }
}

/**
 * Middleware para identificar e configurar o tenant atual
 */
export const tenantMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    let tenantSlug: string | null = null

    // 1. Extrair tenant do subdomain (empresa.utmify.com)
    const host = request.headers.host || ''
    const subdomain = extractSubdomain(host)
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenantSlug = subdomain
      logger.debug(`Tenant extraído do subdomain: ${tenantSlug}`)
    }

    // 2. Fallback: extrair do header X-Tenant-Slug
    if (!tenantSlug) {
      tenantSlug = request.headers['x-tenant-slug'] as string || null
      if (tenantSlug) {
        logger.debug(`Tenant extraído do header: ${tenantSlug}`)
      }
    }

    // 3. Fallback: extrair do query parameter (para desenvolvimento)
    if (!tenantSlug && process.env.NODE_ENV === 'development') {
      tenantSlug = (request.query as any)?.tenant || null
      if (tenantSlug) {
        logger.debug(`Tenant extraído do query param: ${tenantSlug}`)
      }
    }

    // 4. Para desenvolvimento, usar tenant padrão se não especificado
    if (!tenantSlug && process.env.NODE_ENV === 'development') {
      tenantSlug = 'demo'
      logger.debug('Usando tenant padrão para desenvolvimento: demo')
    }

    if (!tenantSlug) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Tenant não identificado. Verifique o subdomain ou header X-Tenant-Slug.'
      })
    }

    // 5. Buscar organização no banco de dados
    const organization = await request.server.db.organization.findUnique({
      where: { 
        slug: tenantSlug,
        isActive: true 
      },
      select: {
        id: true,
        slug: true,
        name: true,
        planType: true,
        isActive: true
      }
    })

    if (!organization) {
      logger.warn(`Organização não encontrada ou inativa: ${tenantSlug}`)
      return reply.code(404).send({
        error: 'Not Found',
        message: `Organização '${tenantSlug}' não encontrada ou inativa.`
      })
    }

    // 6. Adicionar informações do tenant ao request
    request.tenant = {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      planType: organization.planType,
      isActive: organization.isActive,
      schema: `tenant_${organization.slug}`
    }

    // 7. Setar schema PostgreSQL para isolamento
    await setTenantSchema(request.tenant.schema, request.server.db)

    logger.debug(`Tenant configurado: ${organization.name} (${organization.slug})`)
    
  } catch (error) {
    logger.error(`Erro no middleware de tenant: ${error.message}`, error)
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Erro interno ao processar tenant.'
    })
  }
}

/**
 * Extrai o subdomain do host
 * Exemplo: empresa.utmify.com -> empresa
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null

  // Remove porta se existir
  const hostWithoutPort = host.split(':')[0]
  const parts = hostWithoutPort.split('.')

  // Para desenvolvimento local (localhost:3000)
  if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    return null
  }

  // Para domínios como empresa.utmify.com
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * Configura o schema PostgreSQL para o tenant atual
 */
async function setTenantSchema(schema: string, db: any): Promise<void> {
  try {
    // Criar schema se não existir
    await db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    
    // Setar search_path para o schema do tenant
    await db.$executeRawUnsafe(`SET search_path TO "${schema}", public`)
    
    logger.debug(`Schema configurado: ${schema}`)
  } catch (error) {
    logger.error(`Erro ao configurar schema ${schema}: ${error.message}`)
    throw error
  }
}

/**
 * Valida se o usuário tem acesso ao tenant atual
 */
export function validateTenantAccess(userOrganizationId: string, tenantId: string): boolean {
  return userOrganizationId === tenantId
}

/**
 * Gera chave de cache com prefixo do tenant
 */
export function generateCacheKey(tenantSlug: string, key: string): string {
  return `tenant:${tenantSlug}:${key}`
}

/**
 * Gera nome da fila com isolamento por tenant
 */
export function generateQueueName(tenantSlug: string, queueName: string): string {
  return `${tenantSlug}_${queueName}`
}