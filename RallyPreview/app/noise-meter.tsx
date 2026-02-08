import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';

const COLORS = {
  orange: '#FF6B35',
  navy: '#131B2E',
  navyMid: '#1C2842',
  blue: '#2D9CDB',
  offWhite: '#F5F7FA',
  gray: '#8B95A5',
  success: '#34C759',
  error: '#FF3B30',
};

const GAUGE_SIZE = 200;
const GAUGE_STROKE = 10;
const POINTS = 25;
const GOAL_DB = 90;
const GOAL_DURATION_MS = 2000;

function getDbColor(db: number): string {
  if (db < 60) return COLORS.orange;
  if (db < 80) return '#F5A623';
  if (db < 90) return COLORS.success;
  return '#00FF88';
}

export default function NoiseMeterScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const alreadyCompleted = state.gameday.completedActivations.includes('noise');

  const [currentDb, setCurrentDb] = useState(0);
  const [peakDb, setPeakDb] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  const dbRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bonusTimeRef = useRef(0);
  const hasReachedGoal = useRef(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  const bonusOpacity = useRef(new Animated.Value(0)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const startPulse = useCallback(() => {
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.08,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.current.start();
  }, [buttonScale]);

  const stopPulse = useCallback(() => {
    if (pulseAnim.current) {
      pulseAnim.current.stop();
      pulseAnim.current = null;
    }
    buttonScale.setValue(1);
  }, [buttonScale]);

  const triggerFlash = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flashAnim]);

  const handleComplete = useCallback(() => {
    setCompleted(true);
    dispatch({
      type: 'COMPLETE_ACTIVATION',
      activationId: 'noise',
      points: POINTS,
      description: 'Noise Meter: Goal reached!',
    });
  }, [dispatch]);

  const startRecording = useCallback(() => {
    if (completed || alreadyCompleted) return;
    setIsRecording(true);
    startPulse();

    intervalRef.current = setInterval(() => {
      const delta = Math.random() * 15 - 5; // range: -5 to +10
      dbRef.current = Math.max(0, Math.min(100, dbRef.current + delta));
      const newDb = Math.round(dbRef.current);

      setCurrentDb(newDb);
      setPeakDb((prev) => Math.max(prev, newDb));

      Animated.timing(gaugeAnim, {
        toValue: newDb / 100,
        duration: 80,
        useNativeDriver: false,
      }).start();

      // Check for bonus zone (90+)
      if (newDb >= GOAL_DB) {
        if (!hasReachedGoal.current) {
          hasReachedGoal.current = true;
          setShowBonus(true);
          Animated.timing(bonusOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
          triggerFlash();
        }
        bonusTimeRef.current += 50; // interval is 50ms
        if (bonusTimeRef.current >= GOAL_DURATION_MS) {
          // Auto-complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          handleComplete();
        }
      } else {
        if (hasReachedGoal.current) {
          hasReachedGoal.current = false;
          setShowBonus(false);
          bonusOpacity.setValue(0);
        }
        // Don't reset bonusTimeRef - cumulative time above 90
      }
    }, 50);
  }, [completed, alreadyCompleted, startPulse, gaugeAnim, bonusOpacity, triggerFlash, handleComplete]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    stopPulse();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    dbRef.current = 0;
    setCurrentDb(0);
    setShowBonus(false);
    hasReachedGoal.current = false;
    bonusOpacity.setValue(0);

    Animated.timing(gaugeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [stopPulse, gaugeAnim, bonusOpacity]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopPulse();
    };
  }, [stopPulse]);

  const dbColor = getDbColor(currentDb);

  // Already completed screen
  if (alreadyCompleted || completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="megaphone" size={20} color={COLORS.offWhite} />
            <Text style={styles.headerTitle}>Noise Meter</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="ribbon" size={64} color={COLORS.success} style={styles.successIcon} />
          <Text style={styles.successTitle}>Noise Goal Reached!</Text>
          <Text style={styles.successPoints}>+{POINTS} pts earned</Text>
          {peakDb > 0 && (
            <Text style={styles.successPeak}>Peak: {peakDb} dB</Text>
          )}
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Active noise meter screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#FFFFFF',
            opacity: flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
            zIndex: 100,
          },
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="megaphone" size={20} color={COLORS.offWhite} />
          <Text style={styles.headerTitle}>Noise Meter</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>+{POINTS} pts</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Bonus banner */}
        <Animated.View style={[styles.bonusBanner, { opacity: bonusOpacity }]}>
          <View style={styles.bonusTextRow}>
            <Ionicons name="star" size={20} color={COLORS.success} />
            <Text style={styles.bonusText}>BONUS!</Text>
          </View>
        </Animated.View>

        {/* Gauge */}
        <View style={styles.gaugeContainer}>
          {/* Background ring */}
          <View style={styles.gaugeRing}>
            {/* Progress arc (simulated with border) */}
            <Animated.View
              style={[
                styles.gaugeProgress,
                {
                  borderColor: dbColor,
                  borderTopColor: gaugeAnim.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [COLORS.navyMid, dbColor, dbColor],
                  }),
                  borderRightColor: gaugeAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [COLORS.navyMid, dbColor, dbColor],
                  }),
                  borderBottomColor: gaugeAnim.interpolate({
                    inputRange: [0, 0.75, 1],
                    outputRange: [COLORS.navyMid, COLORS.navyMid, dbColor],
                  }),
                  borderLeftColor: COLORS.navyMid,
                  transform: [
                    {
                      rotate: gaugeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
            {/* Center circle with dB value */}
            <View style={styles.gaugeCenter}>
              <Text style={[styles.gaugeValue, { color: isRecording ? dbColor : COLORS.gray }]}>
                {currentDb}
              </Text>
              <Text style={styles.gaugeUnit}>dB</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Peak</Text>
            <Text style={styles.statValue}>{peakDb} dB</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{GOAL_DB}+ dB</Text>
          </View>
        </View>

        {/* Instruction */}
        <Text style={styles.instruction}>
          {isRecording ? 'LOUDER! Keep going!' : 'GET LOUD!'}
        </Text>
        <Text style={styles.subInstruction}>
          {isRecording
            ? `Hit ${GOAL_DB} dB and hold for 2 seconds`
            : 'Press and hold the button below'}
        </Text>

        {/* Record button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            activeOpacity={1}
          >
            <View style={styles.recordButtonInner}>
              {isRecording ? (
                <Ionicons name="volume-high" size={36} color="#FFFFFF" />
              ) : (
                <Ionicons name="mic" size={36} color="#FFFFFF" />
              )}
              <Text style={styles.recordText}>
                {isRecording ? 'Recording...' : 'Hold to Record'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Progress toward goal */}
        {bonusTimeRef.current > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (bonusTimeRef.current / GOAL_DURATION_MS) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.min(100, Math.round((bonusTimeRef.current / GOAL_DURATION_MS) * 100))}%
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131B2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F7FA',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsBadgeText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C2842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#8B95A5',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bonusBanner: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  bonusTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bonusText: {
    color: '#34C759',
    fontSize: 20,
    fontWeight: '800',
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    marginVertical: 24,
  },
  gaugeRing: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    borderWidth: GAUGE_STROKE,
    borderColor: '#1C2842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeProgress: {
    position: 'absolute',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    borderWidth: GAUGE_STROKE,
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 52,
    fontWeight: '900',
    color: '#8B95A5',
  },
  gaugeUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B95A5',
    marginTop: -4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2842',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 24,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#8B95A5',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    color: '#F5F7FA',
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A3652',
  },
  instruction: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subInstruction: {
    color: '#8B95A5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1C2842',
    borderWidth: 4,
    borderColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: '#FF6B35',
  },
  recordButtonInner: {
    alignItems: 'center',
    gap: 8,
  },
  recordIcon: {
    fontSize: 36,
  },
  recordText: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    width: '80%',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1C2842',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  progressText: {
    color: '#8B95A5',
    fontSize: 13,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successPoints: {
    color: '#34C759',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  successPeak: {
    color: '#8B95A5',
    fontSize: 15,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
