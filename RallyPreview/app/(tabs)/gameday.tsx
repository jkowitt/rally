import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme/colors';
import { useApp } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import { formatPointsShort } from '../../src/utils/points';

export default function GamedayScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const activations = [
    {
      id: 'trivia',
      emoji: '🧠',
      title: 'Trivia Challenge',
      points: '+50 pts',
      status: 'Live',
      statusColor: Colors.success,
      bgColor: Colors.blueAlpha(0.15),
      onPress: () => router.push('/trivia'),
    },
    {
      id: 'prediction',
      emoji: '🏆',
      title: 'Halftime Prediction',
      points: '+75 pts',
      status: 'Live',
      statusColor: Colors.success,
      bgColor: Colors.orangeAlpha(0.15),
      onPress: () => router.push('/prediction'),
    },
    {
      id: 'noise',
      emoji: '📢',
      title: 'Noise Meter',
      points: '+25 pts',
      status: 'Live',
      statusColor: Colors.success,
      bgColor: Colors.successAlpha(0.15),
      onPress: () => router.push('/noise-meter'),
    },
    {
      id: 'photo-challenge',
      emoji: '📸',
      title: 'Photo Challenge',
      points: '+30 pts',
      status: 'Q4',
      statusColor: Colors.gray,
      bgColor: Colors.grayAlpha(0.15),
      onPress: () => Alert.alert('Coming Soon', 'Available in Q4!'),
    },
  ];

  const leaderboard = [
    { rank: 1, name: 'MikeFan2026', points: '3,450', isYou: false },
    { rank: 2, name: 'SarahSports', points: '2,890', isYou: false },
    { rank: 5, name: 'You', points: formatPointsShort(state.points.balance), isYou: true },
  ];

  const fanPointsPct = state.gameday.fanPointsTarget > 0
    ? `${(state.gameday.fanPointsCurrent / state.gameday.fanPointsTarget) * 100}%`
    : '0%';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gameday</Text>
          <View style={styles.liveIndicator}>
            <Animated.View
              style={[styles.liveDot, { opacity: pulseAnim }]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Scoreboard Card */}
        <View style={styles.scoreboardCard}>
          <View style={styles.scoreboardTeams}>
            {/* Home Team */}
            <View style={styles.teamColumn}>
              <View style={styles.teamLogoHome}>
                <Text style={styles.teamLogoText}>W</Text>
              </View>
              <Text style={styles.teamLabel}>HOME</Text>
              <Text style={styles.teamScore}>{state.gameday.homeScore}</Text>
            </View>

            {/* Center */}
            <View style={styles.scoreCenter}>
              <Text style={styles.quarter}>{state.gameday.quarter}</Text>
              <Text style={styles.gameClock}>{state.gameday.clock}</Text>
              <Text style={styles.gameDate}>Feb 10, 2026</Text>
            </View>

            {/* Away Team */}
            <View style={styles.teamColumn}>
              <View style={styles.teamLogoAway}>
                <Text style={styles.teamLogoText}>T</Text>
              </View>
              <Text style={styles.teamLabel}>AWAY</Text>
              <Text style={styles.teamScore}>{state.gameday.awayScore}</Text>
            </View>
          </View>

          {/* Fan Points Goal */}
          <View style={styles.fanPointsGoal}>
            <View style={styles.fanPointsHeader}>
              <Text style={styles.fanPointsLabel}>Fan Points Goal</Text>
              <Text style={styles.fanPointsValue}>
                {formatPointsShort(state.gameday.fanPointsCurrent)} / {formatPointsShort(state.gameday.fanPointsTarget)}
              </Text>
            </View>
            <View style={styles.fanPointsBarTrack}>
              <View style={[styles.fanPointsBarFill, { width: fanPointsPct }]} />
            </View>
          </View>
        </View>

        {/* Check-in Button */}
        <View style={styles.checkInSection}>
          <TouchableOpacity
            style={[
              styles.checkInButton,
              state.gameday.checkedIn && styles.checkInButtonChecked,
            ]}
            onPress={() => {
              if (!state.gameday.checkedIn) {
                dispatch({ type: 'CHECK_IN' });
              }
            }}
            activeOpacity={0.8}
          >
            {state.gameday.checkedIn ? (
              <>
                <Ionicons name="checkmark-circle" size={36} color="#FFFFFF" />
                <Text style={styles.checkInButtonText}>CHECKED IN!</Text>
              </>
            ) : (
              <>
                <Ionicons name="location" size={36} color="#FFFFFF" />
                <Text style={styles.checkInButtonText}>CHECK IN</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.checkInSubtext}>
            {state.gameday.checkedIn
              ? '✓ You earned +100 pts!'
              : '+100 pts for checking in'}
          </Text>
        </View>

        {/* Activations Section */}
        <Text style={styles.sectionTitle}>Activations</Text>
        <View style={styles.activationsList}>
          {activations.map((item) => {
            const isCompleted = state.gameday.completedActivations.includes(item.id);
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.activationRow}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.activationIcon,
                    { backgroundColor: item.bgColor },
                  ]}
                >
                  <Text style={styles.activationEmoji}>{item.emoji}</Text>
                </View>
                <View style={styles.activationInfo}>
                  <Text style={styles.activationTitle}>{item.title}</Text>
                  <Text style={styles.activationPoints}>{item.points}</Text>
                </View>
                {isCompleted ? (
                  <View style={[styles.activationStatus, { backgroundColor: Colors.successAlpha(0.15) }]}>
                    <Text style={[styles.activationStatusText, { color: Colors.success }]}>
                      Completed ✓
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.activationStatus,
                      {
                        backgroundColor:
                          item.statusColor === Colors.success
                            ? Colors.successAlpha(0.15)
                            : Colors.grayAlpha(0.15),
                      },
                    ]}
                  >
                    {item.statusColor === Colors.success && (
                      <View style={styles.activationLiveDot} />
                    )}
                    <Text
                      style={[
                        styles.activationStatusText,
                        { color: item.statusColor },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leaderboard Preview */}
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        <View style={styles.leaderboardCard}>
          {leaderboard.map((entry) => (
            <View
              key={entry.rank}
              style={[
                styles.leaderboardRow,
                entry.isYou && styles.leaderboardRowHighlight,
              ]}
            >
              <View style={styles.leaderboardRank}>
                <Text
                  style={[
                    styles.leaderboardRankText,
                    entry.isYou && styles.leaderboardRankTextHighlight,
                  ]}
                >
                  #{entry.rank}
                </Text>
              </View>
              <Text
                style={[
                  styles.leaderboardName,
                  entry.isYou && styles.leaderboardNameHighlight,
                ]}
              >
                {entry.name}
              </Text>
              <Text
                style={[
                  styles.leaderboardPoints,
                  entry.isYou && styles.leaderboardPointsHighlight,
                ]}
              >
                {entry.points}
              </Text>
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
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successAlpha(0.15),
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs + 2,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: 1,
  },

  /* Scoreboard */
  scoreboardCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.orangeAlpha(0.25),
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreboardTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogoHome: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  teamLogoAway: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  teamLogoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  teamScore: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.offWhite,
  },
  scoreCenter: {
    alignItems: 'center',
    flex: 1,
  },
  quarter: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  gameClock: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  gameDate: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },

  /* Fan Points Goal */
  fanPointsGoal: {
    borderTopWidth: 1,
    borderTopColor: Colors.whiteAlpha(0.08),
    paddingTop: Spacing.lg,
  },
  fanPointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  fanPointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
  },
  fanPointsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.orange,
  },
  fanPointsBarTrack: {
    height: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fanPointsBarFill: {
    height: '100%',
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
  },

  /* Check-in */
  checkInSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  checkInButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  checkInButtonChecked: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  checkInButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  checkInSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: Spacing.md,
  },

  /* Section Title */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: Spacing.md,
  },

  /* Activations */
  activationsList: {
    marginBottom: Spacing.xxl,
  },
  activationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activationIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activationEmoji: {
    fontSize: 22,
  },
  activationInfo: {
    flex: 1,
  },
  activationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  activationPoints: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  activationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  activationLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  activationStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Leaderboard */
  leaderboardCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.whiteAlpha(0.05),
  },
  leaderboardRowHighlight: {
    backgroundColor: Colors.orangeAlpha(0.12),
    borderBottomWidth: 0,
  },
  leaderboardRank: {
    width: 36,
    marginRight: Spacing.md,
  },
  leaderboardRankText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gray,
  },
  leaderboardRankTextHighlight: {
    color: Colors.orange,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  leaderboardNameHighlight: {
    color: Colors.orange,
    fontWeight: '700',
  },
  leaderboardPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray,
  },
  leaderboardPointsHighlight: {
    color: Colors.orange,
  },
});
