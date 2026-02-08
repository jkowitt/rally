import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
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
  error: '#FF3B30',
};

type RedeemedEntry = {
  reward: {
    id: string;
    name: string;
    iconName: string;
    iconFamily: string;
    points: number;
    category: string;
    description: string;
    bgColor: string;
  };
  date: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyRewardsScreen() {
  const router = useRouter();
  const { state } = useApp();

  const redeemedRewards = state.rewards.redeemed;

  const handleShowQR = (rewardName: string) => {
    Alert.alert('QR Code', `QR code for "${rewardName}" would appear here.`, [{ text: 'OK' }]);
  };

  const renderItem = ({ item }: { item: RedeemedEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.emojiCircle, { backgroundColor: item.reward.bgColor || COLORS.navyLight }]}>
          <Ionicons name={item.reward.iconName as any} size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.reward.name}
        </Text>
        <Text style={styles.cardDate}>Redeemed on {formatDate(item.date)}</Text>
      </View>
      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => handleShowQR(item.reward.name)}
        activeOpacity={0.7}
      >
        <Text style={styles.qrButtonText}>Show QR</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift" size={48} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No rewards redeemed yet</Text>
      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.emptyLink}>Visit the Rewards tab</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.offWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rewards</Text>
        <View style={styles.backButton} />
      </View>

      {/* List */}
      <FlatList
        data={redeemedRewards}
        keyExtractor={(item, index) => `${item.reward.id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          redeemedRewards.length === 0 ? styles.emptyList : styles.listContent
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyMid,
    borderRadius: 14,
    padding: 16,
  },
  cardLeft: {
    marginRight: 14,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardCenter: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  qrButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  qrButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.orange,
  },
  separator: {
    height: 10,
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
    marginBottom: 12,
  },
  emptyLink: {
    fontSize: 15,
    color: COLORS.blue,
    fontWeight: '600',
  },
});
