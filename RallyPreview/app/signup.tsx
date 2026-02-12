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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs for field navigation
  const handleRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isFormValid =
    name.trim() &&
    handle.trim() &&
    email.trim() &&
    password &&
    confirmPassword &&
    termsAccepted;

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSignup = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!handle.trim()) {
      setError('Please choose a handle');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const result = await register(email.trim(), password, name.trim(), formattedHandle);
    setLoading(false);

    if (result.success) {
      router.replace('/select-school');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
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
          {/* Heading */}
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join the Rally community</Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Full Name */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'name' && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={focusedField === 'name' ? Colors.orange : Colors.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={Colors.gray}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => handleRef.current?.focus()}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Handle */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'handle' && styles.inputContainerFocused,
            ]}
          >
            <Text
              style={[
                styles.atPrefix,
                { color: focusedField === 'handle' ? Colors.orange : Colors.gray },
              ]}
            >
              @
            </Text>
            <TextInput
              ref={handleRef}
              style={styles.input}
              placeholder="handle"
              placeholderTextColor={Colors.gray}
              value={handle.replace(/^@/, '')}
              onChangeText={(text) => setHandle(text.replace(/^@/, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              onFocus={() => setFocusedField('handle')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

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
              ref={emailRef}
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focusedField === 'password' ? Colors.orange : Colors.gray}
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.gray}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View
            style={[
              styles.inputContainer,
              focusedField === 'confirm' && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focusedField === 'confirm' ? Colors.orange : Colors.gray}
              style={styles.inputIcon}
            />
            <TextInput
              ref={confirmPasswordRef}
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              onFocus={() => setFocusedField('confirm')}
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

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                termsAccepted && styles.checkboxChecked,
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/terms')}
              >
                Terms & Conditions
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!isFormValid || loading) && styles.createButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={!isFormValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkTextHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Headings
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: Colors.gray,
    marginBottom: 24,
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
    marginBottom: 12,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: Colors.orange,
  },
  inputIcon: {
    marginRight: 12,
  },
  atPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.offWhite,
    paddingVertical: 14,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
    backgroundColor: Colors.navyMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  termsText: {
    fontSize: 13,
    color: Colors.gray,
    flex: 1,
  },
  termsLink: {
    color: Colors.orange,
    textDecorationLine: 'underline',
  },

  // Create Account Button
  createButton: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
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
