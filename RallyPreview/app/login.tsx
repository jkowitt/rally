import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, state } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      // Navigation depends on user state
      router.replace('/select-school');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const handleGuestContinue = () => {
    router.replace('/select-school');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/rally-wordmark-white-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Sign in to your Rally account</Text>

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
              emailFocused && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={emailFocused ? Colors.orange : Colors.gray}
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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputContainer,
              passwordFocused && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={passwordFocused ? Colors.orange : Colors.gray}
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
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

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkTextHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* Guest Link */}
          <TouchableOpacity
            style={styles.guestRow}
            onPress={handleGuestContinue}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.gray} />
          </TouchableOpacity>
        </ScrollView>

        {/* Server Status */}
        <View style={styles.serverStatus}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: state.serverConnected
                  ? Colors.success
                  : Colors.gray,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {state.serverConnected ? 'Connected' : 'Offline Mode'}
          </Text>
        </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 140,
    height: 40,
  },

  // Headings
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.offWhite,
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 28,
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

  // Sign In Button
  signInButton: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
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

  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  guestText: {
    fontSize: 14,
    color: Colors.gray,
  },

  // Server Status
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.gray,
  },
});
