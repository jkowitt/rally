import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';

const COLORS = {
  orange: '#FF6B35',
  navy: '#131B2E',
  navyMid: '#1C2842',
  navyLight: '#243052',
  blue: '#2D9CDB',
  offWhite: '#F5F7FA',
  gray: '#8B95A5',
  success: '#34C759',
};

const MEDAL_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
} as const;

type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  initial: string;
  isUser: boolean;
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { state } = useApp();
  const leaderboard: LeaderboardEntry[] = state.leaderboard;

  const userEntry = useMemo(
    () => leaderboard.find((entry) => entry.isUser) || null,
    [leaderboard],
  );

  const top3 = useMemo(() => {
    const sorted = leaderboard.filter((e) => e.rank <= 3);
    return {
      first: sorted.find((e) => e.rank === 1) || null,
      second: sorted.find((e) => e.rank === 2) || null,
      third: sorted.find((e) => e.rank === 3) || null,
    };
  }, [leaderboard]);

  const renderPodiumEntry = (
    entry: LeaderboardEntry | null,
    size: 'large' | 'small',
  ) => {
    if (!entry) return <View style={styles.podiumSlot} />;

    const avatarSize = size === 'large' ? 80 : 64;
    const fontSize = size === 'large' ? 28 : 22;
    const medalColor =
      MEDAL_COLORS[entry.rank as keyof typeof MEDAL_COLORS] || COLORS.gray;

    return (
      <View style={styles.podiumSlot}>
        {/* Rank badge */}
        <View style={[styles.podiumRankBadge, { backgroundColor: medalColor }]}>
          <Text style={styles.podiumRankText}>{entry.rank}</Text>
        </View>

        {/* Avatar */}
        <View
          style={[
            styles.podiumAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: medalColor,
            },
          ]}
        >
          <Text style={[styles.podiumInitial, { fontSize }]}>
            {entry.initial}
          </Text>
        </View>

        {/* Name */}
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry.name}
        </Text>

        {/* Points */}
        <Text style={[styles.podiumPoints, { color: medalColor }]}>
          {entry.points.toLocaleString('en-US')} pts
        </Text>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const medalColor =
      MEDAL_COLORS[item.rank as keyof typeof MEDAL_COLORS] || null;

    return (
      <View
        style={[
          styles.listRow,
          item.isUser && styles.listRowHighlighted,
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {isTop3 ? (
            <Ionicons
              name="trophy"
              size={20}
              color={medalColor || COLORS.gray}
            />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View
          style={[
            styles.listAvatar,
            {
              backgroundColor: item.isUser
                ? COLORS.orange
                : isTop3
                  ? medalColor || COLORS.navyLight
                  : COLORS.navyLight,
            },
          ]}
        >
          <Text style={styles.listInitial}>{item.initial}</Text>
        </View>

        {/* Name */}
        <Text
          style={[styles.listName, item.isUser && styles.listNameHighlighted]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {/* Points */}
        <Text
          style={[
            styles.listPoints,
            item.isUser && styles.listPointsHighlighted,
          ]}
        >
          {item.points.toLocaleString('en-US')} pts
        </Text>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Podium Section */}
      <View style={styles.podiumContainer}>
        <View style={styles.podiumRow}>
          {/* 2nd place on left */}
          {renderPodiumEntry(top3.second, 'small')}

          {/* 1st place in center */}
          {renderPodiumEntry(top3.first, 'large')}

          {/* 3rd place on right */}
          {renderPodiumEntry(top3.third, 'small')}
        </View>
      </View>

      {/* Your Position Card */}
      {userEntry && (
        <View style={styles.userCard}>
          <View style={styles.userCardLeft}>
            <View style={styles.userCardRankCircle}>
              <Text style={styles.userCardRankText}>#{userEntry.rank}</Text>
            </View>
            <View style={styles.userCardInfo}>
              <Text style={styles.userCardName}>{userEntry.name}</Text>
              <Text style={styles.userCardLabel}>Your Position</Text>
            </View>
          </View>
          <Text style={styles.userCardPoints}>
            {userEntry.points.toLocaleString('en-US')} pts
          </Text>
        </View>
      )}

      {/* Section title */}
      <Text style={styles.sectionTitle}>All Rankings</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.offWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.backButton} />
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => `lb-${item.rank}-${item.name}`}
        renderItem={renderListItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
  },

  /* ---- Podium ---- */
  podiumContainer: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  podiumRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  podiumAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  podiumInitial: {
    fontWeight: '800',
    color: COLORS.navy,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.offWhite,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* ---- Your Position Card ---- */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.navyMid,
    borderWidth: 1.5,
    borderColor: COLORS.orange,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userCardRankCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userCardRankText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 2,
  },
  userCardLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  userCardPoints: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.orange,
  },

  /* ---- Section Title ---- */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  /* ---- List ---- */
  listContent: {
    paddingBottom: 40,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listRowHighlighted: {
    backgroundColor: COLORS.orange + '18',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.offWhite,
    marginRight: 12,
  },
  listNameHighlighted: {
    color: COLORS.orange,
  },
  listPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray,
  },
  listPointsHighlighted: {
    color: COLORS.orange,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.navyLight,
    marginLeft: 60,
  },
});
