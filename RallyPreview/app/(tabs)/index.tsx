import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme/colors';

const rallyLogo = require('../../assets/rally-wordmark-white-transparent.png');
const rallyIcon = require('../../assets/rally-icon-navy.png');

export default function HomeScreen() {
  const [countdown, setCountdown] = useState({
    days: 2,
    hours: 14,
    minutes: 32,
    seconds: 8,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds -= 1;
        if (seconds < 0) {
          seconds = 59;
          minutes -= 1;
        }
        if (minutes < 0) {
          minutes = 59;
          hours -= 1;
        }
        if (hours < 0) {
          hours = 23;
          days -= 1;
        }
        if (days < 0) {
          clearInterval(interval);
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Image source={rallyLogo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.subtitle}>Welcome back, Jordan!</Text>
          </View>
          <Image source={rallyIcon} style={styles.avatarIcon} resizeMode="contain" />
        </View>

        {/* Sponsor Banner */}
        <View style={styles.sponsorBanner}>
          <View style={styles.sponsorLogo}>
            <Text style={styles.sponsorLogoText}>N</Text>
          </View>
          <Text style={styles.sponsorText}>Presented by Nike</Text>
        </View>

        {/* Next Game Card */}
        <View style={styles.nextGameCard}>
          <Text style={styles.nextGameLabel}>NEXT GAME</Text>
          <Text style={styles.nextGameTitle}>Wildcats vs Tigers</Text>
          <Text style={styles.nextGameDate}>Saturday, Feb 10 • 7:00 PM</Text>
          <View style={styles.countdownRow}>
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hrs' },
              { value: countdown.minutes, label: 'Min' },
              { value: countdown.seconds, label: 'Sec' },
            ].map((unit, i) => (
              <React.Fragment key={unit.label}>
                {i > 0 && <Text style={styles.countdownSeparator}>:</Text>}
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{pad(unit.value)}</Text>
                  <Text style={styles.countdownLabel}>{unit.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Points Summary - 2 Column Grid */}
        <View style={styles.pointsRow}>
          <View style={styles.pointsCard}>
            <Text style={styles.pointsValue}>1,250</Text>
            <Text style={styles.pointsLabel}>Your Points</Text>
          </View>
          <View style={styles.tierCard}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>★ All-Star</Text>
            </View>
            <Text style={styles.tierSubLabel}>Current Tier</Text>
          </View>
        </View>

        {/* Tier Progress Card */}
        <View style={styles.tierProgressCard}>
          <View style={styles.tierProgressHeader}>
            <Text style={styles.tierProgressTitle}>Tier Progress</Text>
            <Text style={styles.tierProgressRemaining}>3,750 to MVP</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={styles.progressBarFill} />
          </View>
          <View style={styles.tierProgressLabels}>
            <Text style={styles.tierProgressLabelText}>All-Star • 2,000</Text>
            <Text style={styles.tierProgressLabelText}>MVP • 5,000</Text>
          </View>
        </View>

        {/* Latest Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllLink}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Feed Card */}
        <View style={styles.feedCard}>
          <View style={styles.feedImageArea}>
            <View style={styles.feedBadge}>
              <Text style={styles.feedBadgeText}>Article</Text>
            </View>
            <Text style={styles.feedEmoji}>🏈</Text>
          </View>
          <View style={styles.feedContent}>
            <Text style={styles.feedTitle}>
              Season Opener Preview: What to Expect
            </Text>
            <Text style={styles.feedSubtitle}>
              Breaking down the matchups, key players, and predictions for
              Saturday's big game.
            </Text>
          </View>
        </View>

        {/* Fan Poll Card */}
        <View style={styles.pollCard}>
          <View style={styles.pollHeader}>
            <Text style={styles.pollHeaderText}>📊 Fan Poll</Text>
            <Text style={styles.pollVotes}>1,847 votes</Text>
          </View>
          <Text style={styles.pollQuestion}>
            Who will be Player of the Game?
          </Text>
          {[
            { name: 'Marcus Johnson', pct: 42, color: Colors.orange },
            { name: 'Devon Williams', pct: 31, color: Colors.blue },
            { name: 'Chris Anderson', pct: 27, color: Colors.gray },
          ].map((option) => (
            <View key={option.name} style={styles.pollOption}>
              <View style={styles.pollBarTrack}>
                <View
                  style={[
                    styles.pollBarFill,
                    {
                      width: `${option.pct}%`,
                      backgroundColor: option.color,
                      opacity: 0.25,
                    },
                  ]}
                />
              </View>
              <View style={styles.pollBarContent}>
                <Text style={styles.pollOptionName}>{option.name}</Text>
                <Text
                  style={[styles.pollOptionPct, { color: option.color }]}
                >
                  {option.pct}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  logoImage: {
    width: 100,
    height: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray,
    marginTop: 4,
  },
  avatarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Sponsor Banner */
  sponsorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sponsorLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sponsorLogoText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.offWhite,
  },
  sponsorText: {
    fontSize: 13,
    color: Colors.gray,
  },

  /* Next Game Card */
  nextGameCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  nextGameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.orange,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  nextGameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: Spacing.xs,
  },
  nextGameDate: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 56,
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.grayAlpha(0.4),
    marginHorizontal: 4,
    marginBottom: 14,
  },

  /* Points Summary */
  pointsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.orange,
  },
  pointsLabel: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  tierCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierBadge: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tierBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierSubLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },

  /* Tier Progress */
  tierProgressCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tierProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tierProgressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  tierProgressRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blue,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: Colors.navyLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    width: '25%',
    height: '100%',
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
  },
  tierProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierProgressLabelText: {
    fontSize: 12,
    color: Colors.gray,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },

  /* Feed Card */
  feedCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  feedImageArea: {
    height: 140,
    backgroundColor: Colors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  feedBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.orangeAlpha(0.2),
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  feedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedEmoji: {
    fontSize: 48,
  },
  feedContent: {
    padding: Spacing.lg,
  },
  feedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: Spacing.xs,
  },
  feedSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
  },

  /* Fan Poll */
  pollCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pollHeaderText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  pollVotes: {
    fontSize: 13,
    color: Colors.gray,
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.offWhite,
    marginBottom: Spacing.md,
  },
  pollOption: {
    marginBottom: Spacing.sm,
    height: 44,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: Colors.navyLight,
  },
  pollBarTrack: {
    ...StyleSheet.absoluteFillObject,
  },
  pollBarFill: {
    height: '100%',
    borderRadius: Radius.sm,
  },
  pollBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  pollOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  pollOptionPct: {
    fontSize: 14,
    fontWeight: '700',
  },
});
