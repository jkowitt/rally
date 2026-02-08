import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { TRIVIA_QUESTIONS } from '../src/data/mockData';

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

const LETTERS = ['A', 'B', 'C', 'D'];
const TIME_PER_QUESTION = 15;
const POINTS_PER_QUESTION = 50;

export default function TriviaScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const alreadyCompleted = state.gameday.completedActivations.includes('trivia');

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [gameOver, setGameOver] = useState(false);

  const timerWidth = useRef(new Animated.Value(1)).current;
  const timerAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = TRIVIA_QUESTIONS[currentQuestion];

  const stopTimer = useCallback(() => {
    if (timerAnimation.current) {
      timerAnimation.current.stop();
      timerAnimation.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (showResult) return;

    stopTimer();
    setShowResult(true);

    const isCorrect =
      selectedAnswer !== null && selectedAnswer === question.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + POINTS_PER_QUESTION);
    }

    resultTimeout.current = setTimeout(() => {
      if (currentQuestion < TRIVIA_QUESTIONS.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(TIME_PER_QUESTION);
      } else {
        setGameOver(true);
      }
    }, 1500);
  }, [showResult, selectedAnswer, question, currentQuestion, stopTimer]);

  // Start timer for each question
  useEffect(() => {
    if (gameOver || alreadyCompleted || showResult) return;

    timerWidth.setValue(1);
    setTimeLeft(TIME_PER_QUESTION);

    timerAnimation.current = Animated.timing(timerWidth, {
      toValue: 0,
      duration: TIME_PER_QUESTION * 1000,
      useNativeDriver: false,
    });
    timerAnimation.current.start();

    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopTimer();
      if (resultTimeout.current) {
        clearTimeout(resultTimeout.current);
      }
    };
  }, [currentQuestion, gameOver, alreadyCompleted]);

  // Auto-submit when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && !showResult && !gameOver) {
      handleSubmit();
    }
  }, [timeLeft, showResult, gameOver, handleSubmit]);

  const getTimerColor = () => {
    if (timeLeft > 10) return COLORS.success;
    if (timeLeft > 5) return '#F5A623';
    return COLORS.error;
  };

  const getOptionStyle = (index: number) => {
    if (!showResult) {
      if (selectedAnswer === index) {
        return { borderColor: COLORS.orange, borderWidth: 2, backgroundColor: COLORS.navyMid };
      }
      return { borderColor: COLORS.navyMid, borderWidth: 1, backgroundColor: COLORS.navyMid };
    }
    if (index === question.correctIndex) {
      return { borderColor: COLORS.success, borderWidth: 2, backgroundColor: 'rgba(52,199,89,0.15)' };
    }
    if (selectedAnswer === index && index !== question.correctIndex) {
      return { borderColor: COLORS.error, borderWidth: 2, backgroundColor: 'rgba(255,59,48,0.15)' };
    }
    return { borderColor: COLORS.navyMid, borderWidth: 1, backgroundColor: COLORS.navyMid };
  };

  const handleClaim = () => {
    dispatch({
      type: 'COMPLETE_ACTIVATION',
      activationId: 'trivia',
      points: score,
      description: `Trivia Challenge: ${score / POINTS_PER_QUESTION}/${TRIVIA_QUESTIONS.length} correct`,
    });
    router.back();
  };

  // Already completed screen
  if (alreadyCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧠 Trivia Challenge</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.completedIcon}>✅</Text>
          <Text style={styles.completedTitle}>Already Completed</Text>
          <Text style={styles.completedSubtitle}>
            You've already finished this trivia challenge. Check back next gameday!
          </Text>
          <TouchableOpacity style={styles.claimButton} onPress={() => router.back()}>
            <Text style={styles.claimButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Game over / summary screen
  if (gameOver) {
    const totalCorrect = score / POINTS_PER_QUESTION;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧠 Trivia Challenge</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.summaryEmoji}>🎉</Text>
          <Text style={styles.summaryTitle}>Great job!</Text>
          <Text style={styles.summaryScore}>{score} pts</Text>
          <Text style={styles.summaryDetail}>
            {totalCorrect} of {TRIVIA_QUESTIONS.length} correct
          </Text>
          <View style={styles.summaryBreakdown}>
            {TRIVIA_QUESTIONS.map((q, i) => (
              <View key={q.id} style={styles.summaryRow}>
                <Text style={styles.summaryQuestionNum}>Q{i + 1}</Text>
                <Text style={styles.summaryQuestionText} numberOfLines={1}>
                  {q.question}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
            <Text style={styles.claimButtonText}>Claim {score} Points</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Active question screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧠 Trivia Challenge</Text>
        <View style={styles.headerRight}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>+50 pts each</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer bar */}
      <View style={styles.timerContainer}>
        <Animated.View
          style={[
            styles.timerBar,
            {
              width: timerWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: getTimerColor(),
            },
          ]}
        />
      </View>
      <View style={styles.timerRow}>
        <Text style={styles.questionCounter}>
          Question {currentQuestion + 1} of {TRIVIA_QUESTIONS.length}
        </Text>
        <Text style={[styles.timerText, timeLeft <= 5 && { color: COLORS.error }]}>
          {timeLeft}s
        </Text>
      </View>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={styles.scoreValue}>{score} pts</Text>
      </View>

      {/* Question */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const optionStyle = getOptionStyle(index);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, optionStyle]}
              onPress={() => {
                if (!showResult) setSelectedAnswer(index);
              }}
              activeOpacity={showResult ? 1 : 0.7}
              disabled={showResult}
            >
              <View
                style={[
                  styles.letterBadge,
                  selectedAnswer === index && !showResult && { backgroundColor: COLORS.orange },
                  showResult && index === question.correctIndex && { backgroundColor: COLORS.success },
                  showResult && selectedAnswer === index && index !== question.correctIndex && { backgroundColor: COLORS.error },
                ]}
              >
                <Text style={styles.letterText}>{LETTERS[index]}</Text>
              </View>
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result feedback */}
      {showResult && (
        <View style={styles.resultContainer}>
          {selectedAnswer === question.correctIndex ? (
            <Text style={[styles.resultText, { color: COLORS.success }]}>+50 pts!</Text>
          ) : (
            <Text style={[styles.resultText, { color: COLORS.error }]}>Incorrect</Text>
          )}
        </View>
      )}

      {/* Submit button */}
      {!showResult && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            selectedAnswer === null && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedAnswer === null}
        >
          <Text style={styles.submitButtonText}>Submit Answer</Text>
        </TouchableOpacity>
      )}
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
  timerContainer: {
    height: 4,
    backgroundColor: '#1C2842',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 2,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  questionCounter: {
    color: '#8B95A5',
    fontSize: 14,
    fontWeight: '500',
  },
  timerText: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  scoreLabel: {
    color: '#8B95A5',
    fontSize: 14,
  },
  scoreValue: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: '#1C2842',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  questionText: {
    color: '#F5F7FA',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    color: '#F5F7FA',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resultText: {
    fontSize: 20,
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    marginHorizontal: 20,
    marginTop: 20,
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
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  completedIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  completedTitle: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completedSubtitle: {
    color: '#8B95A5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  summaryEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#F5F7FA',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryScore: {
    color: '#FF6B35',
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 4,
  },
  summaryDetail: {
    color: '#8B95A5',
    fontSize: 15,
    marginBottom: 24,
  },
  summaryBreakdown: {
    width: '100%',
    backgroundColor: '#1C2842',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryQuestionNum: {
    color: '#8B95A5',
    fontSize: 13,
    fontWeight: '600',
    width: 28,
  },
  summaryQuestionText: {
    color: '#F5F7FA',
    fontSize: 14,
    flex: 1,
  },
  claimButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
