import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Generate a deterministic QR-like pattern from a string
function generateQRPattern(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= size - 7;
      const isBottomLeft = r >= size - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const localR = isBottomLeft ? r - (size - 7) : r;
        const localC = isTopRight ? c - (size - 7) : c;
        if (localR === 0 || localR === 6 || localC === 0 || localC === 6) {
          grid[r][c] = true;
        } else if (localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4) {
          grid[r][c] = true;
        } else {
          grid[r][c] = false;
        }
      } else {
        const val = Math.abs((hash * (r * size + c + 1)) % 100);
        grid[r][c] = val < 45;
      }
    }
  }
  return grid;
}

function QRCode({ value, size }: { value: string; size: number }) {
  const pattern = useMemo(() => generateQRPattern(value), [value]);

  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8 }}>
      <View style={{ flex: 1 }}>
        {pattern.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', flex: 1 }}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={{
                  flex: 1,
                  backgroundColor: cell ? '#000000' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

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
  date: Date;
};

export default function MyRewardsScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [qrModal, setQrModal] = useState<RedeemedEntry | null>(null);

  const redeemedRewards = state.rewards.redeemed;

  const renderItem = ({ item }: { item: RedeemedEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconCircle, { backgroundColor: item.reward.bgColor || COLORS.navyLight }]}>
          <Ionicons name={item.reward.iconName as any} size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.reward.name}
        </Text>
        <Text style={styles.cardDate}>Redeemed {formatDate(item.date)}</Text>
      </View>
      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => setQrModal(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="qr-code" size={16} color={COLORS.orange} style={{ marginRight: 4 }} />
        <Text style={styles.qrButtonText}>Show QR</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift" size={48} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No rewards redeemed yet</Text>
      <Text style={styles.emptySubtitle}>
        Head to the Rewards tab to browse and redeem rewards with your points.
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={styles.emptyButton}
      >
        <Text style={styles.emptyLink}>Browse Rewards</Text>
      </TouchableOpacity>
    </View>
  );

  // Stable code for QR modal
  const qrCode = useMemo(() => {
    if (!qrModal) return '';
    return `RALLY-${qrModal.reward.id.replace('reward-', '').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, [qrModal]);

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

      {/* Count */}
      {redeemedRewards.length > 0 && (
        <View style={styles.countBar}>
          <Ionicons name="gift" size={16} color={COLORS.orange} />
          <Text style={styles.countText}>
            {redeemedRewards.length} reward{redeemedRewards.length !== 1 ? 's' : ''} redeemed
          </Text>
        </View>
      )}

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

      {/* QR Code Modal */}
      <Modal
        visible={qrModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setQrModal(null)}
            >
              <Ionicons name="close" size={24} color={COLORS.offWhite} />
            </TouchableOpacity>

            <View style={[styles.modalIconCircle, { backgroundColor: qrModal?.reward.bgColor || COLORS.navyLight }]}>
              <Ionicons name={(qrModal?.reward.iconName as any) || 'gift'} size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>{qrModal?.reward.name}</Text>
            <Text style={styles.modalSubtitle}>
              Present this QR code at the redemption point
            </Text>

            <View style={styles.qrContainer}>
              <QRCode
                value={`rally:reward:${qrModal?.reward.id}:${qrModal?.date}`}
                size={200}
              />
            </View>

            <Text style={styles.modalCode}>{qrCode}</Text>
            <Text style={styles.modalExpiry}>Valid for 15 minutes from display</Text>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
  },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.navyMid,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    marginBottom: 16,
  },
  modalCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.orange,
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalExpiry: {
    fontSize: 12,
    color: COLORS.gray,
  },
});
