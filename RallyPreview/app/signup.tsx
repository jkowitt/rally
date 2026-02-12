import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';
import { SCHOOLS, searchSchools } from '../src/data/schools';
import type { School } from '../src/data/schools';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_COUNT = 3;
const STEP_LABELS = ['Account Info', 'School Selection', 'Verification'];
const RESEND_COOLDOWN = 60; // seconds
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very strong';

interface PasswordStrength {
  level: StrengthLevel;
  score: number; // 0-4
  color: string;
  label: string;
}

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { level: 'weak', score: 0, color: Colors.error, label: 'Weak' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { level: 'weak', score: 1, color: Colors.error, label: 'Weak' };
  if (score === 2) return { level: 'fair', score: 2, color: Colors.warning, label: 'Fair' };
  if (score === 3) return { level: 'strong', score: 3, color: Colors.blue, label: 'Strong' };
  return { level: 'very strong', score: 4, color: Colors.success, label: 'Very Strong' };
}

function passwordMeetsRequirements(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();

  // ── Step management ────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);

  // ── Step 1: Account Info ───────────────────────────────────────────────
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs for field navigation
  const handleRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // ── Step 2: School Selection ───────────────────────────────────────────
  const [schoolSearch, setSchoolSearch] = useState('');
  const [favoriteSchool, setFavoriteSchool] = useState<School | null>(null);
  const [supportingSchools, setSupportingSchools] = useState<School[]>([]);

  // ── Step 3: Verification ───────────────────────────────────────────────
  const [verificationCode, setVerificationCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [codeInputs, setCodeInputs] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const codeRefs = useRef<(TextInput | null)[]>([]);

  // ── Derived state ──────────────────────────────────────────────────────
  const passwordStrength = getPasswordStrength(password);
  const filteredSchools = searchSchools(schoolSearch);

  // ── Validation helpers ─────────────────────────────────────────────────
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isStep1Valid =
    name.trim().length > 0 &&
    handle.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordMeetsRequirements(password) &&
    password === confirmPassword &&
    termsAccepted;

  const isStep2Valid = favoriteSchool !== null;

  const enteredCode = codeInputs.join('');
  const isStep3Valid = enteredCode.length === 6;

  // ── Resend countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Generate and show code when entering step 3 ────────────────────────
  const sendVerificationCode = useCallback(() => {
    const code = generateVerificationCode();
    setExpectedCode(code);
    setResendTimer(RESEND_COOLDOWN);
    setCodeInputs(['', '', '', '', '', '']);
    Alert.alert('Demo Verification Code', `Your code is: ${code}`, [{ text: 'OK' }]);
  }, []);

  // ── Code input handlers ────────────────────────────────────────────────
  const handleCodeChange = (text: string, index: number) => {
    // Only accept digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newInputs = [...codeInputs];
    newInputs[index] = digit;
    setCodeInputs(newInputs);

    // Auto-advance to next input
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !codeInputs[index] && index > 0) {
      const newInputs = [...codeInputs];
      newInputs[index - 1] = '';
      setCodeInputs(newInputs);
      codeRefs.current[index - 1]?.focus();
    }
  };

  // ── School selection handlers ──────────────────────────────────────────
  const handleSelectSchool = (school: School) => {
    // If it's already the favorite, remove it
    if (favoriteSchool?.id === school.id) {
      setFavoriteSchool(null);
      return;
    }
    // If it's already a supporting school, remove it
    if (supportingSchools.some((s) => s.id === school.id)) {
      setSupportingSchools((prev) => prev.filter((s) => s.id !== school.id));
      return;
    }
    // If no favorite yet, set as favorite
    if (!favoriteSchool) {
      setFavoriteSchool(school);
      return;
    }
    // Otherwise add as supporting (max 2)
    if (supportingSchools.length < 2) {
      setSupportingSchools((prev) => [...prev, school]);
    }
  };

  const removeSchool = (school: School) => {
    if (favoriteSchool?.id === school.id) {
      setFavoriteSchool(null);
    } else {
      setSupportingSchools((prev) => prev.filter((s) => s.id !== school.id));
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────
  const goNext = async () => {
    setError('');

    if (currentStep === 0) {
      // Validate step 1
      if (!name.trim()) { setError('Please enter your full name'); return; }
      if (!handle.trim()) { setError('Please choose a handle'); return; }
      if (!email.trim()) { setError('Please enter your email address'); return; }
      if (!validateEmail(email.trim())) { setError('Please enter a valid email address'); return; }
      if (!passwordMeetsRequirements(password)) {
        setError('Password must be at least 8 characters with an uppercase letter and a number');
        return;
      }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      if (!termsAccepted) { setError('Please accept the Terms & Conditions'); return; }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!favoriteSchool) { setError('Please select a favorite school'); return; }
      setCurrentStep(2);
      // Fire verification code on entering step 3
      setTimeout(() => sendVerificationCode(), 400);
    } else if (currentStep === 2) {
      // Verify code
      if (enteredCode !== expectedCode) {
        setError('Invalid verification code. Please try again.');
        return;
      }

      // All good - register and navigate
      setLoading(true);
      const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
      const result = await register({
        email: email.trim(),
        password,
        name: name.trim(),
        handle: formattedHandle,
        favoriteSchool: favoriteSchool?.id || null,
        supportingSchools: supportingSchools.map((s) => s.id),
        emailUpdates,
        pushNotifications,
        acceptedTerms: termsAccepted,
      });
      setLoading(false);

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    }
  };

  const goBack = () => {
    setError('');
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert('Coming Soon', 'Google Sign-In coming soon', [{ text: 'OK' }]);
  };

  // ── Step indicator ─────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <View key={i} style={styles.stepDotWrapper}>
          <View
            style={[
              styles.stepDot,
              i < currentStep && styles.stepDotCompleted,
              i === currentStep && styles.stepDotActive,
              i > currentStep && styles.stepDotPending,
            ]}
          >
            {i < currentStep ? (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.stepDotText,
                  i === currentStep && styles.stepDotTextActive,
                ]}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < STEP_COUNT - 1 && (
            <View
              style={[
                styles.stepLine,
                i < currentStep && styles.stepLineCompleted,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // ── Password strength bar ──────────────────────────────────────────────
  const renderPasswordStrength = () => {
    if (!password) return null;
    const barCount = 4;
    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBars}>
          {Array.from({ length: barCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.strengthBar,
                {
                  backgroundColor:
                    i < passwordStrength.score
                      ? passwordStrength.color
                      : Colors.navyLight,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
          {passwordStrength.label}
        </Text>
      </View>
    );
  };

  // ── Checkbox row helper ────────────────────────────────────────────────
  const renderCheckbox = (
    label: string,
    value: boolean,
    onToggle: () => void,
    linkText?: string,
    onLinkPress?: () => void,
  ) => (
    <TouchableOpacity
      style={styles.termsRow}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <Text style={styles.termsText}>
        {label}
        {linkText && (
          <Text style={styles.termsLink} onPress={onLinkPress}>
            {linkText}
          </Text>
        )}
      </Text>
    </TouchableOpacity>
  );

  // ── STEP 1: Account Info ───────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <Text style={styles.heading}>Create Account</Text>
      <Text style={styles.subheading}>Join the Rally community</Text>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Google Sign-In */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-google" size={20} color={Colors.offWhite} />
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

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
          placeholder="Password (min 8, uppercase + number)"
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

      {/* Password Strength */}
      {renderPasswordStrength()}

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

      {/* Password match indicator */}
      {confirmPassword.length > 0 && (
        <View style={styles.matchRow}>
          <Ionicons
            name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={password === confirmPassword ? Colors.success : Colors.error}
          />
          <Text
            style={[
              styles.matchText,
              { color: password === confirmPassword ? Colors.success : Colors.error },
            ]}
          >
            {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
          </Text>
        </View>
      )}

      {/* Checkboxes */}
      {renderCheckbox(
        'I agree to the ',
        termsAccepted,
        () => setTermsAccepted(!termsAccepted),
        'Terms & Conditions',
        () => router.push('/terms'),
      )}
      {renderCheckbox(
        'I agree to receive email updates',
        emailUpdates,
        () => setEmailUpdates(!emailUpdates),
      )}
      {renderCheckbox(
        'Enable push notifications',
        pushNotifications,
        () => setPushNotifications(!pushNotifications),
      )}

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          !isStep1Valid && styles.primaryButtonDisabled,
        ]}
        onPress={goNext}
        disabled={!isStep1Valid}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    </>
  );

  // ── STEP 2: School Selection ───────────────────────────────────────────
  const renderSchoolChip = (school: School, isFavorite: boolean) => (
    <View
      key={school.id}
      style={[
        styles.schoolChip,
        { backgroundColor: isFavorite ? Colors.orange : Colors.blue },
      ]}
    >
      <Text style={styles.schoolChipText} numberOfLines={1}>
        {isFavorite ? '\u2605 ' : ''}{school.shortName}
      </Text>
      <TouchableOpacity
        onPress={() => removeSchool(school)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </View>
  );

  const renderSchoolItem = ({ item }: { item: School }) => {
    const isFavorite = favoriteSchool?.id === item.id;
    const isSupporting = supportingSchools.some((s) => s.id === item.id);
    const isSelected = isFavorite || isSupporting;

    return (
      <TouchableOpacity
        style={[
          styles.schoolItem,
          isFavorite && styles.schoolItemFavorite,
          isSupporting && styles.schoolItemSupporting,
        ]}
        onPress={() => handleSelectSchool(item)}
        activeOpacity={0.7}
      >
        <View
          style={[styles.schoolColorDot, { backgroundColor: item.primaryColor }]}
        />
        <View style={styles.schoolItemInfo}>
          <Text style={styles.schoolItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.schoolItemMeta} numberOfLines={1}>
            {item.mascot} | {item.conference} | {item.city}, {item.state}
          </Text>
        </View>
        {isSelected && (
          <View
            style={[
              styles.schoolSelectedBadge,
              { backgroundColor: isFavorite ? Colors.orange : Colors.blue },
            ]}
          >
            <Text style={styles.schoolSelectedBadgeText}>
              {isFavorite ? 'FAV' : 'SUP'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStep2 = () => (
    <>
      <Text style={styles.heading}>Pick Your Schools</Text>
      <Text style={styles.subheading}>
        Choose 1 favorite school and up to 2 supporting schools
      </Text>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Selected chips */}
      {(favoriteSchool || supportingSchools.length > 0) && (
        <View style={styles.chipsContainer}>
          {favoriteSchool && renderSchoolChip(favoriteSchool, true)}
          {supportingSchools.map((s) => renderSchoolChip(s, false))}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orange }]} />
          <Text style={styles.legendText}>Favorite</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.blue }]} />
          <Text style={styles.legendText}>Supporting</Text>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.inputContainer,
          focusedField === 'schoolSearch' && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={focusedField === 'schoolSearch' ? Colors.orange : Colors.gray}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Search schools, mascots, or conferences..."
          placeholderTextColor={Colors.gray}
          value={schoolSearch}
          onChangeText={setSchoolSearch}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocusedField('schoolSearch')}
          onBlur={() => setFocusedField(null)}
        />
        {schoolSearch.length > 0 && (
          <TouchableOpacity onPress={() => setSchoolSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* School count */}
      <Text style={styles.resultCount}>
        {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
      </Text>

      {/* School list */}
      <FlatList
        data={filteredSchools}
        keyExtractor={(item) => item.id}
        renderItem={renderSchoolItem}
        style={styles.schoolList}
        contentContainerStyle={styles.schoolListContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        getItemLayout={(_data, index) => ({
          length: 64,
          offset: 64 * index,
          index,
        })}
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { marginTop: 16 },
          !isStep2Valid && styles.primaryButtonDisabled,
        ]}
        onPress={goNext}
        disabled={!isStep2Valid}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </>
  );

  // ── STEP 3: Email Verification ─────────────────────────────────────────
  const renderStep3 = () => (
    <>
      <View style={styles.verificationIcon}>
        <Ionicons name="mail-open-outline" size={48} color={Colors.orange} />
      </View>

      <Text style={styles.heading}>Verify Your Email</Text>
      <Text style={styles.subheading}>
        We sent a 6-digit code to{'\n'}
        <Text style={{ color: Colors.offWhite, fontWeight: '600' }}>{email}</Text>
      </Text>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Code inputs */}
      <View style={styles.codeRow}>
        {codeInputs.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { codeRefs.current[i] = ref; }}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : null,
              focusedField === `code-${i}` && styles.codeInputFocused,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, i)}
            onKeyPress={(e) => handleCodeKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            onFocus={() => setFocusedField(`code-${i}`)}
            onBlur={() => setFocusedField(null)}
          />
        ))}
      </View>

      {/* Resend */}
      <View style={styles.resendRow}>
        {resendTimer > 0 ? (
          <Text style={styles.resendTimerText}>
            Resend code in {resendTimer}s
          </Text>
        ) : (
          <TouchableOpacity onPress={sendVerificationCode}>
            <Text style={styles.resendButtonText}>Resend Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { marginTop: 24 },
          (!isStep3Valid || loading) && styles.primaryButtonDisabled,
        ]}
        onPress={goNext}
        disabled={!isStep3Valid || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  // ── Main render ────────────────────────────────────────────────────────
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
            onPress={goBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.offWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{STEP_LABELS[currentStep]}</Text>
          <View style={styles.backButton} />
        </View>

        {/* Step dots */}
        {renderStepIndicator()}

        {/* Content */}
        {currentStep === 1 ? (
          // Step 2 uses its own FlatList, so no outer ScrollView
          <View style={styles.stepContent}>
            {renderStep2()}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {currentStep === 0 && renderStep1()}
            {currentStep === 2 && renderStep3()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.offWhite,
  },

  // Step indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  stepDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.orange,
  },
  stepDotCompleted: {
    backgroundColor: Colors.success,
  },
  stepDotPending: {
    backgroundColor: Colors.navyMid,
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray,
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.navyLight,
    marginHorizontal: 6,
  },
  stepLineCompleted: {
    backgroundColor: Colors.success,
  },

  // Scroll
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
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
    marginBottom: 20,
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

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    height: 52,
    marginBottom: 16,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.offWhite,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.navyLight,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.gray,
    marginHorizontal: 12,
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

  // Password strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -4,
    gap: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 72,
    textAlign: 'right',
  },

  // Match indicator
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -4,
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Checkboxes / Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
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

  // ── School Selection ───────────────────────────────────────────────────
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  schoolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  schoolChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 120,
  },

  legendRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.gray,
  },

  resultCount: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 8,
  },

  schoolList: {
    flex: 1,
    marginBottom: 4,
  },
  schoolListContent: {
    paddingBottom: 8,
  },

  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    height: 58,
  },
  schoolItemFavorite: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  schoolItemSupporting: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(45,156,219,0.08)',
  },
  schoolColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  schoolItemInfo: {
    flex: 1,
  },
  schoolItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.offWhite,
  },
  schoolItemMeta: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  schoolSelectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  schoolSelectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Verification ───────────────────────────────────────────────────────
  verificationIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },

  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  codeInput: {
    width: 46,
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
  codeInputFilled: {
    borderColor: Colors.orange,
  },
  codeInputFocused: {
    borderColor: Colors.orange,
    backgroundColor: Colors.navyLight,
  },

  resendRow: {
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 14,
    color: Colors.gray,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },
});
