import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { formatPointsShort, canAfford } from '../src/utils/points';

const { width } = Dimensions.get('window');

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

export default function RewardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();

  const [redeemed, setRedeemed] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  const reward = state.rewards.catalog.find((r) => r.id === id);
  const balance = state.points.balance;
  const affordable = reward ? canAfford(balance, reward.points) : false;
  const deficit = reward ? reward.points - balance : 0;

  useEffect(() => {
    if (redeemed) {
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        router.back();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [redeemed]);

  const handleRedeem = () => {
    if (!reward || !affordable) return;
    dispatch({ type: 'REDEEM_REWARD', rewardId: reward.id });
    setRedeemed(true);
  };

  if (!reward) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Reward not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (redeemed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Animated.View
            style={[
              styles.successCircle,
              {
                transform: [{ scale: checkScale }],
                opacity: checkOpacity,
              },
            ]}
          >
            <Text style={styles.successCheck}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successLabel, { opacity: checkOpacity }]}>
            Redeemed!
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Emoji */}
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{reward.emoji}</Text>
        </View>

        {/* Name & Cost */}
        <Text style={styles.rewardName}>{reward.name}</Text>
        <Text style={styles.rewardCost}>{formatPointsShort(reward.points)} pts</Text>

        {/* Description */}
        <Text style={styles.description}>{reward.description}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceValue}>{formatPointsShort(balance)} pts</Text>
          {affordable ? (
            <Text style={styles.affordableText}>✓ Enough points</Text>
          ) : (
            <Text style={styles.notAffordableText}>
              Need {formatPointsShort(deficit)} more points
            </Text>
          )}
        </View>

        {/* Redeem Button */}
        <TouchableOpacity
          style={[styles.redeemButton, !affordable && styles.redeemButtonDisabled]}
          onPress={handleRedeem}
          disabled={!affordable}
          activeOpacity={0.8}
        >
          <Text style={[styles.redeemButtonText, !affordable && styles.redeemButtonTextDisabled]}>
            Redeem for {formatPointsShort(reward.points)} pts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    marginBottom: 12,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    color: COLORS.blue,
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: COLORS.offWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  emojiContainer: {
    marginBottom: 16,
  },
  emoji: {
    fontSize: 80,
  },
  rewardName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.offWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardCost: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.orange,
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  divider: {
    width: width - 64,
    height: 1,
    backgroundColor: COLORS.navyLight,
    marginBottom: 24,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 8,
  },
  affordableText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  notAffordableText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  redeemButton: {
    width: width - 64,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: COLORS.navyLight,
  },
  redeemButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  redeemButtonTextDisabled: {
    color: COLORS.gray,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successCheck: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.offWhite,
  },
});
