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
import { Colors, Spacing, Radius } from '../../src/theme/colors';

interface MenuItem {
  id: string;
  emoji: string;
  label: string;
  bgColor: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'points', emoji: '📈', label: 'Points History', bgColor: Colors.orangeAlpha(0.15) },
  { id: 'rewards', emoji: '🎁', label: 'My Rewards', bgColor: Colors.blueAlpha(0.15) },
  { id: 'notifications', emoji: '🔔', label: 'Notifications', bgColor: Colors.successAlpha(0.15) },
  { id: 'settings', emoji: '⚙️', label: 'Settings', bgColor: Colors.grayAlpha(0.15) },
  { id: 'help', emoji: '❓', label: 'Help & Support', bgColor: Colors.grayAlpha(0.15) },
];

const STATS = [
  { value: '12', label: 'Games' },
  { value: '1,250', label: 'Points' },
  { value: '8', label: 'Rewards' },
];

export default function ProfileScreen() {
  const handleMenuPress = (item: MenuItem) => {
    Alert.alert(item.label, `Navigate to ${item.label}`);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive' },
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
            <Text style={styles.avatarText}>J</Text>
          </View>
          <Text style={styles.profileName}>Jordan Mitchell</Text>
          <Text style={styles.profileSubtitle}>@jordanm · Member since Sep 2025</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>★ All-Star</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tier Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress to MVP</Text>
            <Text style={styles.progressPercent}>25%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>
          <Text style={styles.progressHint}>
            3,750 more points to reach MVP tier
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
                  <Text style={styles.menuIconEmoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuChevron}>›</Text>
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
    width: '25%',
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
