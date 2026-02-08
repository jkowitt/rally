import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
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

interface PredictionQuestion {
  id: string;
  question: string;
  options: string[];
}

const PREDICTION_QUESTIONS: PredictionQuestion[] = [
  {
    id: 'margin',
    question: 'What will be the final score margin?',
    options: ['1-3 pts', '4-7 pts', '8-14 pts', '15+ pts'],
  },
  {
    id: 'next-score',
    question: 'Who scores next?',
    options: ['Wildcats', 'Tigers'],
  },
  {
    id: 'q4-total',
    question: 'Total points in Q4?',
    options: ['Under 10', '10-17', '18-24', '25+'],
  },
];

const POINTS = 75;

export default function PredictionScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const alreadyCompleted = state.gameday.completedActivations.includes('prediction');

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const pointsFade = useRef(new Animated.Value(0)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allAnswered = PREDICTION_QUESTIONS.every((_, i) => selections[i] !== undefined);

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);

    // Celebration animation
    Animated.sequence([
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pointsFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    dispatch({
      type: 'COMPLETE_ACTIVATION',
      activationId: 'prediction',
      points: POINTS,
      description: 'Halftime Prediction submitted',
    });

    dismissTimeout.current = setTimeout(() => {
      router.back();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, []);

  // Already completed screen
  if (alreadyCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="trophy" size={20} color={COLORS.offWhite} />
            <Text style={styles.headerTitle}>Halftime Prediction</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="lock-closed" size={48} color={COLORS.gray} style={styles.lockedIcon} />
          <Text style={styles.lockedTitle}>Prediction Locked In!</Text>
          <Text style={styles.lockedSubtitle}>
            Your predictions have been submitted. Good luck!
          </Text>
          <View style={styles.lockedChoices}>
            {PREDICTION_QUESTIONS.map((q, i) => (
              <View key={q.id} style={styles.lockedRow}>
                <Text style={styles.lockedQuestion}>{q.question}</Text>
                <View style={styles.lockedChip}>
                  <Text style={styles.lockedChipText}>Submitted</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Submitted celebration overlay
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="trophy" size={20} color={COLORS.offWhite} />
            <Text style={styles.headerTitle}>Halftime Prediction</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Animated.View
            style={[
              styles.celebrationCheckmark,
              { transform: [{ scale: checkmarkScale }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </Animated.View>
          <Animated.Text style={[styles.celebrationPoints, { opacity: pointsFade }]}>
            +{POINTS} pts!
          </Animated.Text>
          <Text style={styles.celebrationTitle}>Prediction Locked In!</Text>
          <Text style={styles.celebrationSubtitle}>
            Results revealed at the end of the game
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main prediction form
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="trophy" size={20} color={COLORS.offWhite} />
          <Text style={styles.headerTitle}>Halftime Prediction</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PREDICTION_QUESTIONS.map((q, qIndex) => (
          <View key={q.id} style={styles.questionBlock}>
            <View style={styles.questionNumberRow}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{qIndex + 1}</Text>
              </View>
              <Text style={styles.questionText}>{q.question}</Text>
            </View>
            <View style={styles.chipsRow}>
              {q.options.map((option, oIndex) => {
                const isSelected = selections[qIndex] === oIndex;
                return (
                  <TouchableOpacity
                    key={oIndex}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => handleSelect(qIndex, oIndex)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Submit button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, !allAnswered && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!allAnswered}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Lock In Prediction</Text>
        </TouchableOpacity>
        {!allAnswered && (
          <Text style={styles.helperText}>
            Answer all {PREDICTION_QUESTIONS.length} questions to submit
          </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  questionBlock: {
    backgroundColor: '#1C2842',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  questionNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  questionText: {
    color: '#F5F7FA',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#131B2E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C2842',
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    color: '#8B95A5',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  helperText: {
    color: '#8B95A5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockedIcon: {
    marginBottom: 16,
  },
  lockedTitle: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockedSubtitle: {
    color: '#8B95A5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  lockedChoices: {
    width: '100%',
    backgroundColor: '#1C2842',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 32,
  },
  lockedRow: {
    gap: 6,
  },
  lockedQuestion: {
    color: '#8B95A5',
    fontSize: 13,
  },
  lockedChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lockedChipText: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#1C2842',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    color: '#F5F7FA',
    fontSize: 17,
    fontWeight: '700',
  },
  celebrationCheckmark: {
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 72,
  },
  celebrationPoints: {
    color: '#FF6B35',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
  },
  celebrationTitle: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    color: '#8B95A5',
    fontSize: 15,
    textAlign: 'center',
  },
});
