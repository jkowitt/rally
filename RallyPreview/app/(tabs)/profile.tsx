import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme/colors';
import { useApp } from '../../src/context/AppContext';
import { formatPointsShort, computeTierProgress } from '../../src/utils/points';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  id: string;
  iconName: IoniconsName;
  label: string;
  bgColor: string;
  route?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'points', iconName: 'trending-up', label: 'Points History', bgColor: Colors.orangeAlpha(0.15), route: '/points-history' },
  { id: 'rewards', iconName: 'gift', label: 'My Rewards', bgColor: Colors.blueAlpha(0.15), route: '/my-rewards' },
  { id: 'notifications', iconName: 'notifications', label: 'Notifications', bgColor: Colors.successAlpha(0.15), route: '/notifications' },
  { id: 'settings', iconName: 'settings', label: 'Settings', bgColor: Colors.grayAlpha(0.15) },
  { id: 'help', iconName: 'help-circle', label: 'Help & Support', bgColor: Colors.grayAlpha(0.15) },
];

export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const gamesAttended = 12;
  const rewardsRedeemed = state.rewards.redeemed.length;
  const unreadNotifications = state.notifications.filter((n) => !n.read).length;

  const progress = state.tier.nextMin
    ? computeTierProgress(state.points.totalEarned, state.tier.min, state.tier.nextMin)
    : 1;
  const progressPercent = Math.round(progress * 100);
  const remaining = state.tier.nextMin
    ? state.tier.nextMin - state.points.totalEarned
    : 0;

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else {
      Alert.alert(item.label, `${item.label} coming soon!`);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => dispatch({ type: 'RESET' }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{state.user.avatarInitial}</Text>
          </View>
          <Text style={styles.profileName}>{state.user.name}</Text>
          <Text style={styles.profileSubtitle}>
            {state.user.handle} · Member since {state.user.memberSince}
          </Text>
          <View style={styles.tierBadge}>
            <Ionicons name="star" size={13} color="#FFFFFF" />
            <Text style={styles.tierBadgeText}>{state.tier.name}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{gamesAttended}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {formatPointsShort(state.points.totalEarned)}
            </Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rewardsRedeemed}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
        </View>

        {/* Tier Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Progress to {state.tier.next || 'Max'}
            </Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {state.tier.next
              ? `${formatPointsShort(remaining)} more points to reach ${state.tier.next} tier`
              : 'You\'ve reached the highest tier!'}
          </Text>
        </View>

        {/* Menu Card */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.iconName} size={18} color={Colors.offWhite} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.id === 'notifications' && unreadNotifications > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadNotifications}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
              </TouchableOpacity>
              {index < MENU_ITEMS.length - 1 && <View style={styles.menuSeparator} />}
            </React.Fragment>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: Spacing.xs,
  },
  profileSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  tierBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.orange,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '500',
  },

  // Tier Progress
  progressCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.blue,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
  },
  progressHint: {
    fontSize: 13,
    color: Colors.gray,
  },

  // Menu Card
  menuCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIconEmoji: {
    fontSize: 18,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  notifBadge: {
    backgroundColor: Colors.orange,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  notifBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuChevron: {
    fontSize: 22,
    color: Colors.gray,
    fontWeight: '300',
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.whiteAlpha(0.05),
    marginLeft: Spacing.lg + 40 + Spacing.md,
  },

  // Sign Out
  signOutButton: {
    backgroundColor: Colors.orangeAlpha(0.12),
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orange,
  },
});
