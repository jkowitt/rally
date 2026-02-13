import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo/test admin account
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'demo@legacyre.com' },
    update: {},
    create: {
      email: 'demo@legacyre.com',
      name: 'Demo Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN', // Full admin privileges including CMS editing
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created test admin account:');
  console.log('   Email: demo@legacyre.com');
  console.log('   Password: demo123');
  console.log('   Role: SUPER_ADMIN (full CMS & site editing capabilities)');

  // Grant access to ALL platforms
  const platforms = ['VALORA', 'BUSINESS_NOW', 'LEGACY_CRM', 'HUB', 'VENUEVR'];

  for (const platform of platforms) {
    await prisma.platformAccess.upsert({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: platform as any,
        },
      },
      update: { enabled: true },
      create: {
        userId: testUser.id,
        platform: platform as any,
        enabled: true,
      },
    });
  }

  console.log('✅ Granted access to all platforms:');
  console.log('   - Legacy RE (Real Estate Valuation)');
  console.log('   - BUSINESS_NOW (Business Management)');
  console.log('   - LEGACY_CRM (Customer Relationship Management)');
  console.log('   - HUB (Central Dashboard)');
  console.log('   - VENUEVR (VR Venue Tours)');

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      description: 'Demo organization for testing Legacy RE platform',
      planType: 'PROFESSIONAL',
    },
  });

  console.log('✅ Created demo organization:', demoOrg.name);

  // Add test user to organization as owner
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: demoOrg.id,
        userId: testUser.id,
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      userId: testUser.id,
      role: 'OWNER',
    },
  });

  console.log('✅ Added test user to organization as OWNER');

  // Create demo property
  const demoProperty = await prisma.property.create({
    data: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'USA',
      propertyType: 'MULTIFAMILY',
      subType: 'Apartment',
      squareFeet: 25000,
      units: 20,
      yearBuilt: 2010,
      latitude: 37.7749,
      longitude: -122.4194,
      aiConditionScore: 85.5,
      aiWearTearNotes: 'Property is in good condition with minor cosmetic updates needed.',
      aiRecommendations: 'Consider updating lobby and common areas. Roof may need attention in 3-5 years.',
    },
  });

  console.log('✅ Created demo property:', demoProperty.address);

  // Create demo valuation
  const demoValuation = await prisma.valuation.create({
    data: {
      userId: testUser.id,
      propertyId: demoProperty.id,
      organizationId: demoOrg.id,
      name: 'Main Street Multifamily Analysis',
      purchasePrice: 5000000,
      currentValue: 5500000,
      estimatedValue: 5750000,
      incomeData: {
        grossRent: 450000,
        otherIncome: 25000,
        vacancyRate: 5,
      },
      expenseData: {
        propertyTax: 60000,
        insurance: 15000,
        utilities: 20000,
        maintenance: 40000,
        propertyManagement: 30000,
      },
      financingData: {
        loanAmount: 3750000,
        interestRate: 6.5,
        loanTerm: 30,
      },
      noi: 285750,
      capRate: 5.19,
      cashOnCash: 8.5,
      dscr: 1.35,
      status: 'COMPLETED',
      visibility: 'PUBLIC',
      approvalStatus: 'APPROVED',
      approvedBy: testUser.id,
      approvedAt: new Date(),
      tags: ['multifamily', 'demo', 'san-francisco'],
      notes: 'Demo valuation showcasing the platform capabilities.',
    },
  });

  console.log('✅ Created demo valuation:', demoValuation.name);

  // Create demo comparables
  await prisma.comparable.createMany({
    data: [
      {
        valuationId: demoValuation.id,
        address: '456 Market Street, San Francisco, CA',
        propertyType: 'MULTIFAMILY',
        squareFeet: 22000,
        salePrice: 4800000,
        saleDate: new Date('2024-01-15'),
        capRate: 5.25,
        pricePerSF: 218.18,
        source: 'MLS',
        sourceUrl: 'https://example.com/comp1',
      },
      {
        valuationId: demoValuation.id,
        address: '789 Oak Avenue, San Francisco, CA',
        propertyType: 'MULTIFAMILY',
        squareFeet: 28000,
        salePrice: 6200000,
        saleDate: new Date('2024-03-20'),
        capRate: 5.0,
        pricePerSF: 221.43,
        source: 'Public Records',
      },
      {
        valuationId: demoValuation.id,
        address: '321 Pine Street, San Francisco, CA',
        propertyType: 'MULTIFAMILY',
        squareFeet: 24000,
        salePrice: 5100000,
        saleDate: new Date('2024-02-10'),
        capRate: 5.15,
        pricePerSF: 212.50,
        source: 'MLS',
      },
    ],
  });

  console.log('✅ Created 3 demo comparables');

  // Create demo portfolio
  const demoPortfolio = await prisma.portfolio.create({
    data: {
      organizationId: demoOrg.id,
      name: 'San Francisco Portfolio',
      description: 'Demo portfolio of Bay Area properties',
    },
  });

  // Link valuation to portfolio
  await prisma.valuation.update({
    where: { id: demoValuation.id },
    data: { portfolioId: demoPortfolio.id },
  });

  console.log('✅ Created demo portfolio and linked valuation');

  // Create sample CMS content
  await prisma.cMSContent.createMany({
    data: [
      {
        key: 'homepage_hero_title',
        value: 'Real Estate Intelligence Platform',
        type: 'TEXT',
        section: 'homepage',
        updatedBy: testUser.id,
      },
      {
        key: 'homepage_hero_subtitle',
        value: 'AI-powered property valuations and comprehensive market analysis',
        type: 'TEXT',
        section: 'homepage',
        updatedBy: testUser.id,
      },
      {
        key: 'valora_cta_text',
        value: 'Start Your Free Trial',
        type: 'TEXT',
        section: 'valora',
        updatedBy: testUser.id,
      },
      {
        key: 'footer_copyright',
        value: '© 2026 Legacy RE. All rights reserved.',
        type: 'TEXT',
        section: 'footer',
        updatedBy: testUser.id,
      },
    ],
  });

  console.log('✅ Created sample CMS content');

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: testUser.id,
      organizationId: demoOrg.id,
      action: 'database_seeded',
      entityType: 'system',
      details: {
        message: 'Database seeded with demo data',
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log('✅ Created activity log entry');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test Account Credentials:');
  console.log('   URL: http://localhost:3007/auth/signin');
  console.log('   Email: demo@legacyre.com');
  console.log('   Password: demo123');
  console.log('   Role: SUPER_ADMIN (Can edit site, manage CMS, add photos)');
  console.log('\n💡 This account has full permissions to:');
  console.log('   • Create and manage properties');
  console.log('   • Create and edit valuations');
  console.log('   • Edit site content via CMS');
  console.log('   • Upload and manage media assets');
  console.log('   • Manage users and organizations');
  console.log('   • Access all dashboard features\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
