/**
 * Seed runner - executes the seed.ts file
 * This is a wrapper to avoid ts-node compiler-options JSON parsing issues
 */

const { execSync } = require('child_process');

try {
  console.log('🌱 Running database seed...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  console.log('✅ Seed completed successfully!');
} catch (error) {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
}
