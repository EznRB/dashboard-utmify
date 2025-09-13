import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      domain: 'demo-org.com',
      settings: JSON.stringify({
        planType: 'PROFESSIONAL',
        planLimits: {
          campaigns: 100,
          users: 10,
          apiRequests: 10000,
          dataRetention: 365
        },
        billingEmail: 'billing@demo-org.com',
        timezone: 'America/New_York',
        currency: 'USD',
        isActive: true,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
  })

  console.log('✅ Created demo organization:', demoOrg.name)

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123456', 12)

  const demoOwner = await prisma.user.upsert({
    where: { email: 'owner@demo-org.com' },
    update: {},
    create: {
      email: 'owner@demo-org.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'OWNER',
      organizationId: demoOrg.id,
      isActive: true
    }
  })

  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-org.com' },
    update: {},
    create: {
      email: 'admin@demo-org.com',
      password: hashedPassword,
      name: 'Jane Smith',
      role: 'ADMIN',
      organizationId: demoOrg.id,
      isActive: true
    }
  })

  const demoMember = await prisma.user.upsert({
    where: { email: 'member@demo-org.com' },
    update: {},
    create: {
      email: 'member@demo-org.com',
      password: hashedPassword,
      name: 'Bob Johnson',
      role: 'MEMBER',
      organizationId: demoOrg.id,
      isActive: true
    }
  })

  console.log('✅ Created demo users:')
  console.log('  - Owner:', demoOwner.email)
  console.log('  - Admin:', demoAdmin.email)
  console.log('  - Member:', demoMember.email)

  // Create demo campaigns
  const campaigns = [
    {
      name: 'Google Ads - Brand Campaign',
      platform: 'GOOGLE_ADS',
      externalId: 'ga_' + nanoid(10),
      budgetType: 'DAILY',
      budget: 100.00,
      spent: 45.50,
      impressions: 1250,
      clicks: 85,
      conversions: 12,
      revenue: 480.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'ACTIVE'
    },
    {
      name: 'Facebook Ads - Lead Generation',
      platform: 'META_ADS',
      externalId: 'fb_' + nanoid(10),
      budgetType: 'DAILY',
      budget: 75.00,
      spent: 32.25,
      impressions: 980,
      clicks: 65,
      conversions: 8,
      revenue: 320.00,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-06-15'),
      status: 'ACTIVE'
    },
    {
      name: 'LinkedIn Ads - B2B Outreach',
      platform: 'LINKEDIN_ADS',
      externalId: 'li_' + nanoid(10),
      budgetType: 'DAILY',
      budget: 150.00,
      spent: 89.75,
      impressions: 750,
      clicks: 45,
      conversions: 15,
      revenue: 750.00,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-01'),
      status: 'ACTIVE'
    }
  ]

  for (const campaignData of campaigns) {
    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        organizationId: demoOrg.id
      }
    })

    // Campaign created successfully

    // Create sample metrics for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const impressions = Math.floor(Math.random() * 1000) + 100
      const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)) // 1-6% CTR
      const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02)) // 2-12% conversion rate
      const spent = parseFloat((Math.random() * campaignData.budget * 0.3).toFixed(2))
      const revenue = parseFloat((conversions * (Math.random() * 100 + 50)).toFixed(2)) // $50-150 per conversion
      
      await prisma.campaignMetric.create({
        data: {
          campaignId: campaign.id,
          date: date,
          impressions: impressions,
          clicks: clicks,
          conversions: conversions,
          spent: spent,
          revenue: revenue,
          ctr: parseFloat((clicks / impressions * 100).toFixed(4)),
          cpc: clicks > 0 ? parseFloat((spent / clicks).toFixed(2)) : 0,
          cpm: parseFloat((spent / impressions * 1000).toFixed(2)),
          roas: spent > 0 ? parseFloat((revenue / spent).toFixed(4)) : 0
        }
      })
    }

    console.log(`✅ Created campaign: ${campaign.name} with 30 days of metrics`)
  }

  console.log('🎉 Database seed completed successfully!')
  console.log('\n📋 Demo Credentials:')
  console.log('  Email: owner@demo-org.com')
  console.log('  Password: demo123456')
  console.log('\n  Email: admin@demo-org.com')
  console.log('  Password: demo123456')
  console.log('\n  Email: member@demo-org.com')
  console.log('  Password: demo123456')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })