/**
 * Netlify Function to create demo account
 *
 * Deploy and visit: https://your-site.netlify.app/.netlify/functions/create-test-account
 *
 * This will create the demo@valora.com demo account with access to all platforms.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PLATFORMS = ['VALORA', 'BUSINESS_NOW', 'LEGACY_CRM', 'HUB', 'VENUEVR'];

exports.handler = async (event, context) => {
  // Only allow POST or GET requests
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('🔍 Checking for demo account...');

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: 'demo@valora.com' },
      include: { platformAccess: true },
    });

    let userCreated = false;

    if (!user) {
      console.log('📝 Creating demo account...');

      // Create demo admin account
      const hashedPassword = await bcrypt.hash('demo123', 10);

      user = await prisma.user.create({
        data: {
          email: 'demo@valora.com',
          name: 'Demo Admin',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          emailVerified: new Date(),
        },
        include: { platformAccess: true },
      });
      userCreated = true;
    }

    // Check and create platform access for all platforms
    const existingPlatforms = user.platformAccess.map((pa) => pa.platform);
    const missingPlatforms = PLATFORMS.filter((p) => !existingPlatforms.includes(p));

    const platformsGranted = [];
    for (const platform of missingPlatforms) {
      await prisma.platformAccess.create({
        data: {
          userId: user.id,
          platform: platform,
          enabled: true,
        },
      });
      platformsGranted.push(platform);
    }

    // Get final platform access status
    const finalAccess = await prisma.platformAccess.findMany({
      where: { userId: user.id },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: userCreated
          ? 'Demo account created successfully!'
          : 'Demo account already exists',
        account: {
          email: 'demo@valora.com',
          password: 'demo123',
          role: user.role,
          id: user.id,
        },
        platformAccess: finalAccess.map((pa) => ({
          platform: pa.platform,
          enabled: pa.enabled,
        })),
        platformsGranted: platformsGranted,
        nextSteps: [
          'Login at /auth/signin',
          'Email: demo@valora.com',
          'Password: demo123',
        ],
      }),
    };

  } catch (error) {
    console.error('❌ Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Make sure DATABASE_URL is set in Netlify environment variables',
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};
