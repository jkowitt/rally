import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const NAVY_LIGHT = '#243052';
const ORANGE = '#FF6B35';
const BLUE = '#2D9CDB';
const OFF_WHITE = '#F5F7FA';
const GRAY = '#8B95A5';
const SUCCESS = '#34C759';
const PURPLE = '#9B59B6';

const STAT_CARDS = [
  { label: 'Total Users', value: '156', icon: 'people' as const, bg: BLUE },
  { label: 'Active Today', value: '43', icon: 'pulse' as const, bg: SUCCESS },
  { label: 'Schools', value: '57', icon: 'school' as const, bg: ORANGE },
  { label: 'Revenue', value: '$12.4K', icon: 'cash' as const, bg: PURPLE },
];

const RECENT_ACTIVITY = [
  { text: 'New user registered - Alex M.', time: '2m ago', icon: 'person-add' as const },
  { text: 'Kent State updated banner ad', time: '15m ago', icon: 'image' as const },
  { text: 'Photo challenge completed x23', time: '1h ago', icon: 'camera' as const },
  { text: 'Reward redeemed: Rally T-Shirt', time: '2h ago', icon: 'gift' as const },
  { text: 'New trivia responses: 47', time: '3h ago', icon: 'help-circle' as const },
];

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
              <Text style={styles.welcomeSubtitle}>Welcome back, Jason Kowitt</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
        </View>

        {/* Stat Cards 2x2 Grid */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.bg + '20' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.bg} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.sectionBadge}>5 new</Text>
          </View>
          {RECENT_ACTIVITY.map((item, index) => (
            <View
              key={index}
              style={[
                styles.activityItem,
                index < RECENT_ACTIVITY.length - 1 && styles.activityItemBorder,
              ]}
            >
              <View style={styles.activityIconWrap}>
                <Ionicons name={item.icon} size={16} color={BLUE} />
              </View>
              <Text style={styles.activityText} numberOfLines={1}>
                {item.text}
              </Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ORANGE }]}
              onPress={() => router.push('/school-admin?schoolId=kent-state')}
              activeOpacity={0.7}
            >
              <Ionicons name="create" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Manage Content</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: BLUE }]}
              onPress={() => router.push('/(admin)/analytics')}
              activeOpacity={0.7}
            >
              <Ionicons name="analytics" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>View Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: SUCCESS }]}
              onPress={() => Alert.alert('Add School', 'School creation form coming soon.')}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Add School</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },

  /* Welcome Card */
  welcomeCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: GRAY,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUCCESS + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
    marginRight: 5,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: SUCCESS,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    width: '48.5%' as any,
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: OFF_WHITE,
  },
  statLabel: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: ORANGE,
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  /* Activity Items */
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY_LIGHT,
  },
  activityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: BLUE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: OFF_WHITE,
  },
  activityTime: {
    fontSize: 11,
    color: GRAY,
    marginLeft: 8,
  },

  /* Quick Actions */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
