import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /demographics/:propertyId (admin+ only)
router.get('/:propertyId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const propertyId = String(req.params.propertyId);

    // Get all fans associated with this property/school
    const fans = await prisma.rallyUser.findMany({
      where: {
        OR: [
          { schoolId: propertyId },
          { propertyId: propertyId },
          { favoriteSchool: propertyId },
          { supportingSchools: { has: propertyId } },
        ],
      },
    });

    const totalFans = fans.length;

    // Age distribution
    const currentYear = new Date().getFullYear();
    const ages = fans
      .filter(f => f.birthYear)
      .map(f => currentYear - f.birthYear!);

    const ageDistribution: Record<string, number> = {
      '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0,
    };
    for (const age of ages) {
      if (age < 25) ageDistribution['18-24']++;
      else if (age < 35) ageDistribution['25-34']++;
      else if (age < 45) ageDistribution['35-44']++;
      else if (age < 55) ageDistribution['45-54']++;
      else ageDistribution['55+']++;
    }

    // User type breakdown
    const userTypeMap: Record<string, number> = {};
    for (const f of fans) {
      const type = f.userType || 'unknown';
      userTypeMap[type] = (userTypeMap[type] || 0) + 1;
    }

    // Cities
    const cityMap: Record<string, number> = {};
    for (const f of fans) {
      if (f.residingCity) {
        const key = f.residingCity;
        cityMap[key] = (cityMap[key] || 0) + 1;
      }
    }
    const cities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count, percentage: totalFans > 0 ? Math.round((count / totalFans) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // States
    const stateMap: Record<string, number> = {};
    for (const f of fans) {
      if (f.residingState) {
        stateMap[f.residingState] = (stateMap[f.residingState] || 0) + 1;
      }
    }
    const states = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count, percentage: totalFans > 0 ? Math.round((count / totalFans) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // Engagement stats
    const pointsEntries = await prisma.pointsEntry.findMany({
      where: { schoolId: propertyId },
    });
    const totalPointsEarned = pointsEntries.reduce((sum, e) => sum + e.points, 0);
    const totalCheckins = pointsEntries.filter(e => e.activationName.toLowerCase().includes('check')).length;

    // Use actual venue/remote data from GameCapture isInStadium field
    const fanIds = fans.map(f => f.id);
    const [atVenueCount, remoteCount] = await Promise.all([
      prisma.gameCapture.count({ where: { userId: { in: fanIds }, isInStadium: true } }),
      prisma.gameCapture.count({ where: { userId: { in: fanIds }, isInStadium: false } }),
    ]);

    // Tier distribution
    const tierMap: Record<string, number> = {};
    for (const f of fans) {
      tierMap[f.tier] = (tierMap[f.tier] || 0) + 1;
    }

    // Preferences
    const emailOptIn = fans.filter(f => f.emailUpdates).length;
    const pushOptIn = fans.filter(f => f.pushNotifications).length;

    // Interests (favorite sports)
    const interestsMap: Record<string, number> = {};
    for (const f of fans) {
      for (const sport of f.favoriteSports) {
        interestsMap[sport] = (interestsMap[sport] || 0) + 1;
      }
    }

    return res.json({
      propertyId,
      totalFans,
      age: {
        average: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
        min: ages.length > 0 ? Math.min(...ages) : null,
        max: ages.length > 0 ? Math.max(...ages) : null,
        distribution: ageDistribution,
      },
      userType: userTypeMap,
      cities,
      states,
      interests: interestsMap,
      engagement: {
        totalCheckins,
        atVenue: atVenueCount,
        remote: remoteCount,
        totalPointsEarned,
        avgPointsPerFan: totalFans > 0 ? Math.round(totalPointsEarned / totalFans) : 0,
      },
      tiers: tierMap,
      preferences: {
        emailOptIn,
        pushOptIn,
      },
    });
  } catch (err) {
    console.error('Demographics error:', err);
    return res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

export default router;
