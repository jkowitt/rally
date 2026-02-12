import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
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

// Try to import auth context - may not exist yet during build
let useAuth: any = null;
try {
  const authModule = require('../../src/context/AuthContext');
  useAuth = authModule.useAuth;
} catch (e) {
  // Auth context not available yet
}

export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  // Auth state (optional)
  let authState: any = null;
  let authActions: any = {};
  try {
    if (useAuth) {
      const auth = useAuth();
      authState = auth;
      authActions = auth;
    }
  } catch (e) {
    // Auth not available
  }

  const isAdmin = authState?.isAdmin ?? false;
  const isDeveloper = authState?.isDeveloper ?? false;
  const isAuthenticated = authState?.isAuthenticated ?? false;
  const editMode = authState?.editMode ?? false;

  const gamesAttended = state.gamesAttended;
  const rewardsRedeemed = state.rewards.redeemed.length;
  const unreadNotifications = state.notifications.filter((n) => !n.read).length;

  const progress = state.tier.nextMin
    ? computeTierProgress(state.points.totalEarned, state.tier.min, state.tier.nextMin)
    : 1;
  const progressPercent = Math.round(progress * 100);
  const remaining = state.tier.nextMin
    ? state.tier.nextMin - state.points.totalEarned
    : 0;

  const menuItems: MenuItem[] = [
    { id: 'points', iconName: 'wallet', label: 'Points History', bgColor: Colors.orangeAlpha(0.15), route: '/points-history' },
    { id: 'rewards', iconName: 'gift', label: 'My Rewards', bgColor: Colors.blueAlpha(0.15), route: '/my-rewards' },
    { id: 'notifications', iconName: 'notifications', label: 'Notifications', bgColor: Colors.successAlpha(0.15), route: '/notifications' },
    { id: 'leaderboard', iconName: 'podium', label: 'Leaderboard', bgColor: Colors.blueAlpha(0.15), route: '/leaderboard' },
    { id: 'settings', iconName: 'settings', label: 'Settings', bgColor: Colors.grayAlpha(0.15), route: '/settings' },
    { id: 'help', iconName: 'help-circle', label: 'Help & Support', bgColor: Colors.grayAlpha(0.15), route: '/help' },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          if (authActions?.logout) authActions.logout();
          dispatch({ type: 'RESET' });
        },
      },
    ]);
  };

  const schoolColor = state.school?.primaryColor ?? Colors.orange;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header - compact */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: schoolColor }]}>
            <Text style={styles.avatarText}>{state.user.avatarInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{state.user.name}</Text>
            <Text style={styles.profileSubtitle}>{state.user.handle} · Since {state.user.memberSince}</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: schoolColor }]}>
            <Ionicons name="shield" size={11} color="#FFFFFF" />
            <Text style={styles.tierBadgeText}>{state.tier.name}</Text>
          </View>
        </View>

        {/* Stats Row - compact */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{gamesAttended}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatPointsShort(state.points.totalEarned)}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rewardsRedeemed}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
        </View>

        {/* Tier Progress - compact */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress to {state.tier.next || 'Max'}</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: schoolColor }]} />
          </View>
          <Text style={styles.progressHint}>
            {state.tier.next ? `${formatPointsShort(remaining)} to ${state.tier.next}` : 'Highest tier reached!'}
          </Text>
        </View>

        {/* Admin Panel Access */}
        {(isAdmin || isDeveloper) && (
          <TouchableOpacity
            style={styles.adminBanner}
            onPress={() => router.push('/(admin)' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.adminBannerLeft}>
              <View style={styles.adminIcon}>
                <Ionicons name="grid" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={styles.adminTitle}>Admin Panel</Text>
                <Text style={styles.adminSubtitle}>{isDeveloper ? 'Developer' : 'Admin'} access</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.orange} />
          </TouchableOpacity>
        )}

        {/* Edit Mode Toggle (admin/developer only) */}
        {(isAdmin || isDeveloper) && authActions?.toggleEditMode && (
          <View style={styles.editModeRow}>
            <View style={styles.editModeLeft}>
              <Ionicons name="create" size={18} color={Colors.orange} />
              <Text style={styles.editModeLabel}>Inline Edit Mode</Text>
            </View>
            <Switch
              value={editMode}
              onValueChange={() => authActions.toggleEditMode()}
              trackColor={{ false: Colors.navyLight, true: Colors.orange }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {/* Login Prompt (if not authenticated) */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.loginBanner}
            onPress={() => router.push('/login' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in" size={20} color={Colors.blue} />
            <Text style={styles.loginText}>Sign in for full features & admin access</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity style={styles.menuRow} onPress={() => handleMenuPress(item)} activeOpacity={0.7}>
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
              {index < menuItems.length - 1 && <View style={styles.menuSeparator} />}
            </React.Fragment>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },

  /* Profile Header - horizontal layout */
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.offWhite, marginBottom: 2 },
  profileSubtitle: { fontSize: 13, color: Colors.gray },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  tierBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  /* Stats */
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.navyMid, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.orange, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },

  /* Progress */
  progressCard: { backgroundColor: Colors.navyMid, borderRadius: Radius.md, padding: Spacing.lg, marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: Colors.offWhite },
  progressPercent: { fontSize: 14, fontWeight: '600', color: Colors.blue },
  progressBarBg: { height: 6, backgroundColor: Colors.navyLight, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: Radius.full },
  progressHint: { fontSize: 12, color: Colors.gray },

  /* Admin Banner */
  adminBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.orangeAlpha(0.1), borderWidth: 1, borderColor: Colors.orangeAlpha(0.3), borderRadius: Radius.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, padding: Spacing.md },
  adminBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  adminIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.orange, justifyContent: 'center', alignItems: 'center' },
  adminTitle: { fontSize: 15, fontWeight: '700', color: Colors.orange },
  adminSubtitle: { fontSize: 12, color: Colors.gray },

  /* Edit Mode */
  editModeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.navyMid, borderRadius: Radius.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  editModeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editModeLabel: { fontSize: 14, fontWeight: '600', color: Colors.offWhite },

  /* Login Banner */
  loginBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.blueAlpha(0.1), borderRadius: Radius.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.md },
  loginText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.blue },

  /* Menu */
  menuCard: { backgroundColor: Colors.navyMid, borderRadius: Radius.lg, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  menuIconContainer: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.offWhite },
  notifBadge: { backgroundColor: Colors.orange, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  notifBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  menuSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.whiteAlpha(0.05), marginLeft: Spacing.lg + 36 + Spacing.md },

  /* Sign Out */
  signOutButton: { backgroundColor: Colors.orangeAlpha(0.12), marginHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.orange },
});
