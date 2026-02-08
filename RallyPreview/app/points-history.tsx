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
import { useApp } from '../src/context/AppContext';
import { formatPointsShort } from '../src/utils/points';

const COLORS = {
  orange: '#FF6B35',
  navy: '#131B2E',
  navyMid: '#1C2842',
  navyLight: '#243052',
  blue: '#2D9CDB',
  offWhite: '#F5F7FA',
  gray: '#8B95A5',
  success: '#34C759',
  error: '#FF3B30',
};

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    checkin: 'Check-in',
    prediction: 'Prediction',
    trivia: 'Trivia',
    noise: 'Noise Meter',
    redemption: 'Reward Redemption',
    poll: 'Poll',
    referral: 'Referral',
    bonus: 'Bonus',
  };
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

type HistoryEntry = {
  id: string;
  description: string;
  amount: number;
  source: string;
  timestamp: string;
};

export default function PointsHistoryScreen() {
  const router = useRouter();
  const { state } = useApp();

  const sortedHistory = useMemo(() => {
    return [...state.points.history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [state.points.history]);

  const totalEarned = useMemo(() => {
    return state.points.history
      .filter((entry) => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [state.points.history]);

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const isEarned = item.amount > 0;

    return (
      <View style={styles.row}>
        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isEarned ? COLORS.success + '20' : COLORS.error + '20' },
          ]}
        >
          <Text style={[styles.iconText, { color: isEarned ? COLORS.success : COLORS.error }]}>
            {isEarned ? '+' : '−'}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.rowDetails}>
          <Text style={styles.rowDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.rowSource}>
            {getSourceLabel(item.source)} · {getRelativeTime(item.timestamp)}
          </Text>
        </View>

        {/* Amount */}
        <Text style={[styles.rowAmount, { color: isEarned ? COLORS.success : COLORS.error }]}>
          {isEarned ? '+' : ''}
          {formatPointsShort(item.amount)}
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📊</Text>
      <Text style={styles.emptyTitle}>No history yet</Text>
      <Text style={styles.emptySubtitle}>
        Start earning points by checking in to events, making predictions, and more!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Points History</Text>
        <View style={styles.backButton} />
      </View>

      {/* Total Earned Banner */}
      {state.points.history.length > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerNumber}>{formatPointsShort(totalEarned)}</Text>
          <Text style={styles.bannerLabel}>Total Earned</Text>
        </View>
      )}

      {/* History List */}
      <FlatList
        data={sortedHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          sortedHistory.length === 0 ? styles.emptyList : styles.listContent
        }
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
  backArrow: {
    fontSize: 24,
    color: COLORS.offWhite,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: COLORS.navyMid,
    alignItems: 'center',
  },
  bannerNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.orange,
    marginBottom: 4,
  },
  bannerLabel: {
    fontSize: 13,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  rowDetails: {
    flex: 1,
    marginRight: 12,
  },
  rowDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.offWhite,
    marginBottom: 3,
  },
  rowSource: {
    fontSize: 12,
    color: COLORS.gray,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.navyLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});
