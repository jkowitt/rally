import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { state, verifyEmail, resendVerification } = useAuth();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Auto-focus first box on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      // Only allow digits
      const digit = text.replace(/[^0-9]/g, '');

      if (digit.length <= 1) {
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        setError('');

        // Move to next box on input
        if (digit && index < CODE_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (digit && index === CODE_LENGTH - 1) {
          const fullCode = newCode.join('');
          if (fullCode.length === CODE_LENGTH) {
            handleVerify(fullCode);
          }
        }
      } else if (digit.length > 1) {
        // Handle paste: distribute digits across boxes
        const digits = digit.slice(0, CODE_LENGTH).split('');
        const newCode = [...code];
        digits.forEach((d, i) => {
          if (index + i < CODE_LENGTH) {
            newCode[index + i] = d;
          }
        });
        setCode(newCode);
        setError('');

        // Focus the next empty box or the last filled box
        const nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();

        // Auto-submit if all filled
        const fullCode = newCode.join('');
        if (fullCode.length === CODE_LENGTH) {
          handleVerify(fullCode);
        }
      }
    },
    [code],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !code[index] && index > 0) {
        // Move to previous box on backspace if current box is empty
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const handleVerify = async (fullCode?: string) => {
    const codeString = fullCode || code.join('');
    setError('');

    if (codeString.length !== CODE_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    const result = await verifyEmail(codeString);

    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Invalid verification code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    const result = await resendVerification();

    if (result.success && result.verificationCode) {
      Alert.alert(
        'Demo Mode',
        `Your verification code is: ${result.verificationCode}`,
        [{ text: 'OK' }],
      );
    } else if (!result.success) {
      setError(result.error || 'Failed to resend code');
    }

    setCanResend(false);
    setResendTimer(RESEND_COOLDOWN);
  };

  const handleShowCode = async () => {
    const result = await resendVerification();
    if (result.success && result.verificationCode) {
      Alert.alert(
        'Demo Mode',
        `Your verification code is: ${result.verificationCode}`,
        [{ text: 'OK' }],
      );
    } else {
      Alert.alert(
        'Demo Mode',
        'Your verification code is: 123456',
        [{ text: 'OK' }],
      );
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.offWhite} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={32} color={Colors.orange} />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Verify Your Email</Text>
          <Text style={styles.subheading}>
            We sent a 6-digit verification code to your email address.
            {state.user?.email ? ` (${state.user.email})` : ''}
          </Text>

          {/* Demo hint */}
          <TouchableOpacity
            style={styles.demoHint}
            onPress={handleShowCode}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={16} color={Colors.blue} />
            <Text style={styles.demoHintText}>Tap here to see the demo code</Text>
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* 6-digit Code Input Boxes */}
          <View style={styles.codeContainer}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeBox,
                  code[index] ? styles.codeBoxFilled : null,
                  error ? styles.codeBoxError : null,
                ]}
                value={code[index]}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                caretHidden={false}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || code.join('').length !== CODE_LENGTH) && styles.verifyButtonDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={loading || code.join('').length !== CODE_LENGTH}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <Text style={styles.verifyButtonText}>Verifying</Text>
              </View>
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Didn't receive a code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend in {formatTimer(resendTimer)}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navyMid,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // Icon Circle
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navyMid,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },

  // Headings
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },

  // Demo Hint
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,156,219,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  demoHintText: {
    fontSize: 13,
    color: Colors.blue,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },

  // Code Input Boxes
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.navyMid,
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  codeBoxFilled: {
    borderColor: Colors.orange,
  },
  codeBoxError: {
    borderColor: Colors.error,
  },

  // Verify Button
  verifyButton: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Resend
  resendContainer: {
    alignItems: 'center',
    gap: 6,
  },
  resendLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.orange,
    fontWeight: '600',
  },
  resendTimer: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
});
