import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme/colors';
import { useApp } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import { formatPointsShort } from '../../src/utils/points';
import { FEED_ITEMS, SPONSORS } from '../../src/data/mockData';

const rallyLogo = require('../../assets/rally-wordmark-white-transparent.png');
const rallyIcon = require('../../assets/rally-icon-navy.png');

export default function HomeScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (state.school === null) {
      router.replace('/select-school');
    }
  }, [state.school]);

  const schoolColor = state.school?.primaryColor ?? Colors.orange;

  // Countdown timer
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

  // Rotating sponsor banner
  const [sponsorIndex, setSponsorIndex] = useState(0);
  const sponsorFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(sponsorFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSponsorIndex((prev) => (prev + 1) % SPONSORS.length);
        Animated.timing(sponsorFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [sponsorFade]);

  const currentSponsor = SPONSORS[sponsorIndex];

  const pad = (n: number) => String(n).padStart(2, '0');

  const progressWidth = state.tier.nextMin
    ? `${((state.points.totalEarned - state.tier.min) / (state.tier.nextMin - state.tier.min)) * 100}%`
    : '100%';

  const tierRemaining = state.tier.nextMin
    ? `${state.tier.nextMin - state.points.totalEarned} to ${state.tier.next || 'Max'}`
    : 'Max tier reached';

  const pollColors = [Colors.orange, Colors.blue, Colors.gray, Colors.success];

  // Feed badge icons
  const getBadgeIcon = (type: string): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'video': return 'play-circle';
      case 'poll': return 'bar-chart';
      default: return 'document-text';
    }
  };

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
            <Text style={styles.subtitle}>
              Welcome back, {state.user.name.split(' ')[0]}!
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: schoolColor }]}
            onPress={() => router.push('/notifications')}
          >
            <Image source={rallyIcon} style={styles.avatarIcon} resizeMode="contain" />
            {state.notifications.filter((n) => !n.read).length > 0 && (
              <View style={styles.notifDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sponsor Banner */}
        <Animated.View style={[styles.sponsorBanner, { opacity: sponsorFade, backgroundColor: currentSponsor.bgColor }]}>
          <View style={styles.sponsorLogo}>
            <Text style={[styles.sponsorLogoText, { color: currentSponsor.textColor }]}>
              {currentSponsor.initial}
            </Text>
          </View>
          <Text style={styles.sponsorText}>{currentSponsor.tagline}</Text>
          <View style={styles.sponsorDots}>
            {SPONSORS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.sponsorDot,
                  i === sponsorIndex && styles.sponsorDotActive,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Next Game Card */}
        <View style={styles.nextGameCard}>
          <Text style={styles.nextGameLabel}>NEXT GAME</Text>
          <Text style={styles.nextGameTitle}>
            {state.school?.shortName || 'Wildcats'} vs Tigers
          </Text>
          <Text style={styles.nextGameDate}>Saturday, Feb 10 - 7:00 PM</Text>
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
          <TouchableOpacity
            style={styles.pointsCard}
            onPress={() => router.push('/points-history')}
            activeOpacity={0.7}
          >
            <Text style={styles.pointsValue}>{formatPointsShort(state.points.balance)}</Text>
            <Text style={styles.pointsLabel}>Your Points</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tierCard}
            onPress={() => router.push('/leaderboard')}
            activeOpacity={0.7}
          >
            <View style={[styles.tierBadge, { backgroundColor: schoolColor }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.tierBadgeText}>{state.tier.name}</Text>
              </View>
            </View>
            <Text style={styles.tierSubLabel}>Current Tier</Text>
          </TouchableOpacity>
        </View>

        {/* Tier Progress Card */}
        <View style={styles.tierProgressCard}>
          <View style={styles.tierProgressHeader}>
            <Text style={styles.tierProgressTitle}>Tier Progress</Text>
            <Text style={styles.tierProgressRemaining}>{tierRemaining}</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: schoolColor }]} />
          </View>
          <View style={styles.tierProgressLabels}>
            <Text style={styles.tierProgressLabelText}>{state.tier.name} - {formatPointsShort(state.tier.min)}</Text>
            <Text style={styles.tierProgressLabelText}>{state.tier.next || 'Max'} - {state.tier.nextMin ? formatPointsShort(state.tier.nextMin) : '--'}</Text>
          </View>
        </View>

        {/* Latest Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest</Text>
        </View>

        {/* Feed Cards - All items */}
        {FEED_ITEMS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.feedCard} activeOpacity={0.8}>
            <View style={[styles.feedImageArea, { backgroundColor: item.bgColor }]}>
              <View style={styles.feedBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={getBadgeIcon(item.type)} size={11} color={Colors.orange} style={{ marginRight: 3 }} />
                  <Text style={styles.feedBadgeText}>{item.badge}</Text>
                </View>
              </View>
              <Ionicons name={item.iconName as any} size={48} color={Colors.gray} />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedSubtitle} numberOfLines={2}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Fan Poll Card */}
        <View style={styles.pollCard}>
          <View style={styles.pollHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bar-chart" size={17} color={Colors.offWhite} style={{ marginRight: 6 }} />
              <Text style={styles.pollHeaderText}>Fan Poll</Text>
            </View>
            <Text style={styles.pollVotes}>{formatPointsShort(state.poll.totalVotes)} votes</Text>
          </View>
          <Text style={styles.pollQuestion}>
            {state.poll.question}
          </Text>
          {state.poll.userVote === null
            ? state.poll.options.map((option, index) => (
                <TouchableOpacity
                  key={option.name}
                  style={styles.pollOption}
                  activeOpacity={0.7}
                  onPress={() => dispatch({ type: 'VOTE_POLL', optionIndex: index })}
                >
                  <View style={styles.pollBarTrack} />
                  <View style={styles.pollBarContent}>
                    <Text style={styles.pollOptionName}>{option.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                  </View>
                </TouchableOpacity>
              ))
            : state.poll.options.map((option, index) => {
                const pct = state.poll.totalVotes > 0
                  ? Math.round((option.votes / state.poll.totalVotes) * 100)
                  : 0;
                const color = pollColors[index % pollColors.length];
                const isUserVote = state.poll.userVote === index;
                return (
                  <View key={option.name} style={styles.pollOption}>
                    <View style={styles.pollBarTrack}>
                      <View
                        style={[
                          styles.pollBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: color,
                            opacity: isUserVote ? 0.4 : 0.25,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.pollBarContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isUserVote && (
                          <Ionicons name="checkmark" size={16} color={Colors.offWhite} style={{ marginRight: 4 }} />
                        )}
                        <Text style={styles.pollOptionName}>
                          {option.name}
                        </Text>
                      </View>
                      <Text
                        style={[styles.pollOptionPct, { color }]}
                      >
                        {pct}%
                      </Text>
                    </View>
                  </View>
                );
              })}
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
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: Colors.navy,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    flex: 1,
    fontSize: 13,
    color: Colors.gray,
  },
  sponsorDots: {
    flexDirection: 'row',
    gap: 4,
  },
  sponsorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.grayAlpha(0.3),
  },
  sponsorDotActive: {
    backgroundColor: Colors.orange,
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

  /* Feed Card */
  feedCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  feedImageArea: {
    height: 120,
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
  feedContent: {
    padding: Spacing.lg,
  },
  feedTitle: {
    fontSize: 16,
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
