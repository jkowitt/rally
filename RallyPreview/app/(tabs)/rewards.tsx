import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../src/theme/colors';
import { useApp } from '../../src/context/AppContext';
import { formatPointsShort } from '../../src/utils/points';
import type { Reward, RewardCategory } from '../../src/data/mockData';

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: '🍔 Food' },
  { id: 'merch', label: '👕 Merch' },
  { id: 'experience', label: '🎬 Experience' },
  { id: 'exclusive', label: '⭐ Exclusive' },
];

function RewardCard({ reward, onPress }: { reward: Reward; onPress: () => void }) {
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

  return (
    <Animated.View style={[styles.rewardCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
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
  const { state } = useApp();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredRewards =
    selectedFilter === 'all'
      ? state.rewards.catalog
      : state.rewards.catalog.filter(
          (r) => r.category === (selectedFilter as RewardCategory),
        );

  const handleRewardPress = (reward: Reward) => {
    router.push({ pathname: '/reward-detail', params: { id: reward.id } });
  };

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
          <Text style={styles.balanceValue}>
            {formatPointsShort(state.points.balance)}
          </Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>★ {state.tier.name}</Text>
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
          {filteredRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onPress={() => handleRewardPress(reward)}
            />
          ))}
        </View>

        {/* Redeemed section */}
        {state.rewards.redeemed.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recently Redeemed</Text>
            {state.rewards.redeemed.map((entry, i) => (
              <View key={`${entry.reward.id}-${i}`} style={styles.redeemedRow}>
                <Text style={styles.redeemedEmoji}>{entry.reward.emoji}</Text>
                <View style={styles.redeemedInfo}>
                  <Text style={styles.redeemedName}>{entry.reward.name}</Text>
                  <Text style={styles.redeemedDate}>
                    {entry.date.toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.redeemedBadge}>
                  <Text style={styles.redeemedBadgeText}>Redeemed</Text>
                </View>
              </View>
            ))}
          </>
        )}
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

  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.offWhite,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  // Redeemed
  redeemedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  redeemedEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  redeemedInfo: {
    flex: 1,
  },
  redeemedName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  redeemedDate: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  redeemedBadge: {
    backgroundColor: Colors.successAlpha(0.15),
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  redeemedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
});
