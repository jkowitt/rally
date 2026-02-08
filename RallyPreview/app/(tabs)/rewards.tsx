import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { Colors, Spacing, Radius } from '../../src/theme/colors';

interface Reward {
  id: string;
  emoji: string;
  name: string;
  points: number;
  bgColor: string;
}

const REWARDS: Reward[] = [
  { id: '1', emoji: '🍔', name: 'Free Hot Dog', points: 200, bgColor: '#2A1F1A' },
  { id: '2', emoji: '👕', name: 'Rally T-Shirt', points: 500, bgColor: '#1A2A2A' },
  { id: '3', emoji: '🏈', name: 'Signed Football', points: 2000, bgColor: '#2A2A1A' },
  { id: '4', emoji: '🎬', name: 'Sideline Pass', points: 5000, bgColor: '#1A1A2A' },
  { id: '5', emoji: '🌮', name: 'Free Nachos', points: 150, bgColor: '#2A1A22' },
  { id: '6', emoji: '⚡', name: 'VIP Upgrade', points: 3000, bgColor: '#1A2A22' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'food', label: '🍔 Food' },
  { id: 'merch', label: '👕 Merch' },
  { id: 'experience', label: '🎬 Experience' },
  { id: 'exclusive', label: '⭐ Exclusive' },
];

function RewardCard({ reward }: { reward: Reward }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Alert.alert(
      'Redeem Reward',
      `Redeem ${reward.name} for ${reward.points.toLocaleString()} pts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redeem', style: 'default' },
      ]
    );
  };

  return (
    <Animated.View style={[styles.rewardCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.rewardCard}
      >
        <View style={[styles.rewardEmojiArea, { backgroundColor: reward.bgColor }]}>
          <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
        </View>
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardName} numberOfLines={1}>
            {reward.name}
          </Text>
          <Text style={styles.rewardPoints}>
            {reward.points.toLocaleString()} pts
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RewardsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.header}>Rewards</Text>

        {/* Points Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceValue}>1,250</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>★ All-Star</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setSelectedFilter(filter.id)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Rewards Grid */}
        <View style={styles.rewardsGrid}>
          {REWARDS.map((reward) => (
            <RewardCard key={reward.id} reward={reward} />
          ))}
        </View>
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
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.offWhite,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  // Points Balance Card
  balanceCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.offWhite,
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

  // Filter Chips
  filtersScroll: {
    marginBottom: Spacing.lg,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.orangeAlpha(0.15),
    borderColor: Colors.orange,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray,
  },
  filterChipTextActive: {
    color: Colors.orange,
  },

  // Rewards Grid
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  rewardCardWrapper: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
  },
  rewardCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  rewardEmojiArea: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEmoji: {
    fontSize: 40,
  },
  rewardInfo: {
    padding: Spacing.md,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.offWhite,
    marginBottom: Spacing.xs,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },
});
