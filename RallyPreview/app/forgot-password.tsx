import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs
  const codeRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSendCode = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    // Mock: simulate sending reset code
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);

    Alert.alert(
      'Demo Mode',
      'Your reset code is: 123456',
      [{ text: 'OK' }],
    );

    setStep(2);
  };

  const handleVerifyAndReset = async () => {
    setError('');

    if (!code.trim()) {
      setError('Please enter the reset code');
      return;
    }
    if (code.trim().length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    if (code.trim() !== '123456') {
      setError('Invalid code. Please try again.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Mock: simulate password reset
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);
    setStep(3);
  };

  const renderStep1 = () => (
    <>
      {/* Heading */}
      <View style={styles.iconCircle}>
        <Ionicons name="mail-outline" size={32} color={Colors.orange} />
      </View>
      <Text style={styles.heading}>Forgot Password?</Text>
      <Text style={styles.subheading}>
        Enter your email address and we'll send you a code to reset your password.
      </Text>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Email */}
      <View
        style={[
          styles.inputContainer,
          focusedField === 'email' && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={18}
          color={focusedField === 'email' ? Colors.orange : Colors.gray}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={Colors.gray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSendCode}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />
      </View>

      {/* Send Code Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Reset Code</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      {/* Heading */}
      <View style={styles.iconCircle}>
        <Ionicons name="key-outline" size={32} color={Colors.orange} />
      </View>
      <Text style={styles.heading}>Reset Password</Text>
      <Text style={styles.subheading}>
        Enter the 6-digit code sent to {email} and choose a new password.
      </Text>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Code */}
      <View
        style={[
          styles.inputContainer,
          focusedField === 'code' && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="keypad-outline"
          size={18}
          color={focusedField === 'code' ? Colors.orange : Colors.gray}
          style={styles.inputIcon}
        />
        <TextInput
          ref={codeRef}
          style={styles.input}
          placeholder="6-digit code"
          placeholderTextColor={Colors.gray}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          returnKeyType="next"
          onSubmitEditing={() => newPasswordRef.current?.focus()}
          onFocus={() => setFocusedField('code')}
          onBlur={() => setFocusedField(null)}
        />
      </View>

      {/* New Password */}
      <View
        style={[
          styles.inputContainer,
          focusedField === 'newPassword' && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={focusedField === 'newPassword' ? Colors.orange : Colors.gray}
          style={styles.inputIcon}
        />
        <TextInput
          ref={newPasswordRef}
          style={styles.input}
          placeholder="New password (min 6 characters)"
          placeholderTextColor={Colors.gray}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          onFocus={() => setFocusedField('newPassword')}
          onBlur={() => setFocusedField(null)}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword(!showNewPassword)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Colors.gray}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View
        style={[
          styles.inputContainer,
          focusedField === 'confirmPassword' && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={focusedField === 'confirmPassword' ? Colors.orange : Colors.gray}
          style={styles.inputIcon}
        />
        <TextInput
          ref={confirmPasswordRef}
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={Colors.gray}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleVerifyAndReset}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Colors.gray}
          />
        </TouchableOpacity>
      </View>

      {/* Reset Password Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleVerifyAndReset}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      {/* Resend Code */}
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => {
          Alert.alert('Demo Mode', 'Your reset code is: 123456', [{ text: 'OK' }]);
        }}
      >
        <Text style={styles.linkText}>
          Didn't receive a code?{' '}
          <Text style={styles.linkTextHighlight}>Resend</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* Success Icon */}
      <View style={styles.successIconCircle}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>
      <Text style={styles.heading}>Password Reset!</Text>
      <Text style={styles.subheading}>
        Your password has been successfully reset. You can now sign in with your new password.
      </Text>

      {/* Back to Login Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        {step !== 3 && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  setError('');
                } else {
                  router.back();
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.offWhite} />
            </TouchableOpacity>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
            </View>

            <View style={styles.backButton} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
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
    justifyContent: 'space-between',
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

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.navyLight,
  },
  stepDotActive: {
    backgroundColor: Colors.orange,
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
  successIconCircle: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
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
    marginBottom: 28,
    lineHeight: 22,
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

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    paddingHorizontal: 16,
    marginBottom: 14,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: Colors.orange,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.offWhite,
    paddingVertical: 14,
  },

  // Primary Button
  primaryButton: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Links
  linkRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: Colors.gray,
  },
  linkTextHighlight: {
    color: Colors.orange,
    fontWeight: '600',
  },
});
