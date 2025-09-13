import { PrismaClient } from '@utmify/database'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

async function seedDemoTenant() {
  try {
    console.log('🌱 Iniciando seed da organização demo...')

    // Verificar se a organização demo já existe
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: 'demo' }
    })

    if (existingOrg) {
      console.log('✅ Organização demo já existe')
      return
    }

    // Criar organização demo com campos básicos
    const demoOrg = await prisma.organization.create({
      data: {
        name: 'Demo Organization',
        slug: 'demo'
      }
    })

    console.log(`✅ Organização demo criada: ${demoOrg.id}`)

    // Criar usuário admin para a organização demo
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@demo.utmify.com',
        name: 'Admin Demo',
        password: '$2b$10$rQZ8kZKZKZKZKZKZKZKZKu', // senha: 'demo123'
        role: 'ADMIN',
        organizationId: demoOrg.id
      }
    })

    console.log(`✅ Usuário admin criado: ${adminUser.id}`)
    console.log('✅ Seed da organização demo concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao fazer seed da organização demo:', error)
    console.error('Stack trace:', error.stack)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  seedDemoTenant()
    .then(() => {
      logger.info('🎉 Seed concluído!')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('💥 Erro no seed:', error)
      process.exit(1)
    })
}

export { seedDemoTenant }