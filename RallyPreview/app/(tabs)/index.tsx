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
import { useApp } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import { formatPointsShort } from '../../src/utils/points';
import { FEED_ITEMS } from '../../src/data/mockData';

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
    days: 2, hours: 14, minutes: 32, seconds: 8,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds -= 1;
        if (seconds < 0) { seconds = 59; minutes -= 1; }
        if (minutes < 0) { minutes = 59; hours -= 1; }
        if (hours < 0) { hours = 23; days -= 1; }
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

  const progressWidth = state.tier.nextMin
    ? `${((state.points.totalEarned - state.tier.min) / (state.tier.nextMin - state.tier.min)) * 100}%`
    : '100%';

  const tierRemaining = state.tier.nextMin
    ? `${state.tier.nextMin - state.points.totalEarned} to ${state.tier.next || 'Max'}`
    : 'Max tier reached';

  const pollColors = [Colors.orange, Colors.blue, Colors.gray, Colors.success];
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const getBadgeIcon = (type: string): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'video': return 'play-circle';
      case 'poll': return 'bar-chart';
      default: return 'newspaper';
    }
  };

  const quickActions = [
    { icon: 'location' as const, label: 'Check In', color: Colors.orange, route: '/(tabs)/gameday' },
    { icon: 'bulb' as const, label: 'Trivia', color: Colors.blue, route: '/trivia' },
    { icon: 'trophy' as const, label: 'Predict', color: '#9B59B6', route: '/prediction' },
    { icon: 'camera' as const, label: 'Photo', color: '#E040FB', route: '/photo-challenge' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={rallyLogo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.subtitle}>
              {state.school?.name || 'Welcome back'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: schoolColor }]}
            onPress={() => router.push('/notifications')}
          >
            <Image source={rallyIcon} style={styles.avatarIcon} resizeMode="contain" />
            {unreadCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Next Game Card - compact */}
        <View style={[styles.nextGameCard, { borderLeftColor: schoolColor, borderLeftWidth: 3 }]}>
          <View style={styles.nextGameTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextGameLabel}>NEXT GAME</Text>
              <Text style={styles.nextGameTitle}>{state.school?.shortName || 'Home'} vs Tigers</Text>
              <Text style={styles.nextGameDate}>Sat, Feb 10 · 7:00 PM</Text>
            </View>
            <View style={styles.countdownCompact}>
              {[
                { value: countdown.days, label: 'D' },
                { value: countdown.hours, label: 'H' },
                { value: countdown.minutes, label: 'M' },
                { value: countdown.seconds, label: 'S' },
              ].map((unit, i) => (
                <View key={unit.label} style={styles.countdownBox}>
                  <Text style={styles.countdownBoxValue}>{pad(unit.value)}</Text>
                  <Text style={styles.countdownBoxLabel}>{unit.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Points + Tier Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/points-history')} activeOpacity={0.7}>
            <Text style={styles.statValue}>{formatPointsShort(state.points.balance)}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/leaderboard')} activeOpacity={0.7}>
            <View style={[styles.tierPill, { backgroundColor: schoolColor }]}>
              <Ionicons name="shield" size={11} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.tierPillText}>{state.tier.name}</Text>
            </View>
            <Text style={styles.statLabel}>Tier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/leaderboard')} activeOpacity={0.7}>
            <Text style={styles.statValue}>#{state.leaderboard.find(e => e.isUser)?.rank || '--'}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </TouchableOpacity>
        </View>

        {/* Tier Progress - compact */}
        <View style={styles.tierProgress}>
          <View style={styles.tierProgressHeader}>
            <Text style={styles.tierProgressTitle}>{state.tier.name}</Text>
            <Text style={styles.tierProgressRemaining}>{tierRemaining}</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: schoolColor }]} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fan Poll Card - compact */}
        <View style={styles.pollCard}>
          <View style={styles.pollHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bar-chart" size={15} color={Colors.offWhite} style={{ marginRight: 5 }} />
              <Text style={styles.pollHeaderText}>Fan Poll</Text>
            </View>
            <Text style={styles.pollVotes}>{formatPointsShort(state.poll.totalVotes)} votes</Text>
          </View>
          <Text style={styles.pollQuestion}>{state.poll.question}</Text>
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
                    <Ionicons name="chevron-forward" size={14} color={Colors.gray} />
                  </View>
                </TouchableOpacity>
              ))
            : state.poll.options.map((option, index) => {
                const pct = state.poll.totalVotes > 0
                  ? Math.round((option.votes / state.poll.totalVotes) * 100) : 0;
                const color = pollColors[index % pollColors.length];
                const isUserVote = state.poll.userVote === index;
                return (
                  <View key={option.name} style={styles.pollOption}>
                    <View style={styles.pollBarTrack}>
                      <View style={[styles.pollBarFill, { width: `${pct}%`, backgroundColor: color, opacity: isUserVote ? 0.4 : 0.25 }]} />
                    </View>
                    <View style={styles.pollBarContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isUserVote && <Ionicons name="checkmark" size={14} color={Colors.offWhite} style={{ marginRight: 3 }} />}
                        <Text style={styles.pollOptionName}>{option.name}</Text>
                      </View>
                      <Text style={[styles.pollOptionPct, { color }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
        </View>

        {/* Latest Feed */}
        <Text style={styles.sectionTitle}>Latest</Text>
        {FEED_ITEMS.slice(0, 4).map((item) => (
          <TouchableOpacity key={item.id} style={styles.feedCard} activeOpacity={0.8}>
            <View style={[styles.feedIcon, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.iconName as any} size={24} color={Colors.gray} />
            </View>
            <View style={styles.feedBody}>
              <View style={styles.feedBadge}>
                <Ionicons name={getBadgeIcon(item.type)} size={10} color={Colors.orange} style={{ marginRight: 2 }} />
                <Text style={styles.feedBadgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.feedTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.feedSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {FEED_ITEMS.length > 4 && (
          <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All Articles</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.orange} />
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  headerLeft: { flex: 1 },
  logoImage: { width: 90, height: 24 },
  subtitle: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarIcon: { width: 38, height: 38, borderRadius: 19 },
  notifDot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: Colors.navy, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifDotText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  /* Next Game */
  nextGameCard: { backgroundColor: Colors.navyMid, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  nextGameTop: { flexDirection: 'row', alignItems: 'center' },
  nextGameLabel: { fontSize: 10, fontWeight: '700', color: Colors.orange, letterSpacing: 1.2, marginBottom: 2 },
  nextGameTitle: { fontSize: 18, fontWeight: '700', color: Colors.offWhite, marginBottom: 1 },
  nextGameDate: { fontSize: 12, color: Colors.gray },
  countdownCompact: { flexDirection: 'row', gap: 4 },
  countdownBox: { alignItems: 'center', backgroundColor: Colors.navyLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 36 },
  countdownBoxValue: { fontSize: 16, fontWeight: '800', color: Colors.offWhite, fontVariant: ['tabular-nums'] },
  countdownBoxLabel: { fontSize: 9, fontWeight: '600', color: Colors.gray },

  /* Stats Row */
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.navyMid, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.orange, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  tierPill: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 2 },
  tierPillText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  /* Tier Progress */
  tierProgress: { backgroundColor: Colors.navyMid, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  tierProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tierProgressTitle: { fontSize: 13, fontWeight: '700', color: Colors.offWhite },
  tierProgressRemaining: { fontSize: 12, fontWeight: '600', color: Colors.blue },
  progressBarTrack: { height: 6, backgroundColor: Colors.navyLight, borderRadius: Radius.full, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: Radius.full },

  /* Quick Actions */
  quickActionsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: Colors.navyMid, borderRadius: Radius.md, paddingVertical: Spacing.md },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: Colors.gray },

  /* Poll */
  pollCard: { backgroundColor: Colors.navyMid, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pollHeaderText: { fontSize: 15, fontWeight: '700', color: Colors.offWhite },
  pollVotes: { fontSize: 12, color: Colors.gray },
  pollQuestion: { fontSize: 14, fontWeight: '600', color: Colors.offWhite, marginBottom: Spacing.sm },
  pollOption: { marginBottom: 6, height: 38, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', backgroundColor: Colors.navyLight },
  pollBarTrack: { ...StyleSheet.absoluteFillObject },
  pollBarFill: { height: '100%', borderRadius: 8 },
  pollBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md },
  pollOptionName: { fontSize: 13, fontWeight: '600', color: Colors.offWhite },
  pollOptionPct: { fontSize: 13, fontWeight: '700' },

  /* Feed */
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.offWhite, marginBottom: Spacing.sm },
  feedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.navyMid, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8 },
  feedIcon: { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  feedBody: { flex: 1 },
  feedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  feedBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.orange, textTransform: 'uppercase', letterSpacing: 0.5 },
  feedTitle: { fontSize: 14, fontWeight: '700', color: Colors.offWhite, marginBottom: 1 },
  feedSubtitle: { fontSize: 12, color: Colors.gray },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
  seeAllText: { fontSize: 14, fontWeight: '600', color: Colors.orange, marginRight: 4 },
});
