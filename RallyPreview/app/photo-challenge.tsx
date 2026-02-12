import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import * as ImagePicker from 'expo-image-picker';

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

const POINTS = 30;
const ACTIVATION_ID = 'photo-challenge';

export default function PhotoChallengeScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const alreadyCompleted = state.gameday.completedActivations.includes(ACTIVATION_ID);
  const existingPhoto = state.gameday.photoUri;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const pointsFade = useRef(new Animated.Value(0)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, []);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to take a photo for the challenge.',
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please allow photo library access to choose a photo for the challenge.',
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleChooseFromGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!selectedImage || submitting) return;
    setSubmitting(true);

    // Simulate a brief upload delay
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);

      dispatch({ type: 'SUBMIT_PHOTO', uri: selectedImage });
      dispatch({
        type: 'COMPLETE_ACTIVATION',
        activationId: ACTIVATION_ID,
        points: POINTS,
        description: 'Photo Challenge',
      });

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

      // Auto-close after 2 seconds
      dismissTimeout.current = setTimeout(() => {
        router.back();
      }, 2000);
    }, 600);
  };

  const handleRemovePhoto = () => {
    setSelectedImage(null);
  };

  // Already completed screen - show submitted photo with Completed badge
  if (alreadyCompleted && !submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="camera" size={20} color={COLORS.offWhite} />
            <Text style={styles.headerTitle}>Photo Challenge</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
          {existingPhoto ? (
            <View style={styles.completedPhotoContainer}>
              <Image source={{ uri: existingPhoto }} style={styles.completedPhoto} />
              <View style={styles.completedOverlay}>
                <Ionicons name="medal" size={32} color={COLORS.success} />
              </View>
            </View>
          ) : (
            <View style={styles.completedPlaceholder}>
              <Ionicons name="camera-outline" size={48} color={COLORS.gray} />
              <Text style={styles.completedPlaceholderText}>Photo submitted</Text>
            </View>
          )}
          <Text style={styles.completedTitle}>Photo Submitted!</Text>
          <Text style={styles.completedSubtitle}>
            You earned +{POINTS} pts for this challenge. Great game day spirit!
          </Text>
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
            <Ionicons name="camera" size={20} color={COLORS.offWhite} />
            <Text style={styles.headerTitle}>Photo Challenge</Text>
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
          <Text style={styles.celebrationTitle}>Photo Submitted!</Text>
          <Text style={styles.celebrationSubtitle}>
            Your game day spirit is unmatched!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main photo challenge screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="camera" size={20} color={COLORS.offWhite} />
          <Text style={styles.headerTitle}>Photo Challenge</Text>
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
        {/* Challenge Prompt */}
        <View style={styles.promptCard}>
          <View style={styles.promptIconRow}>
            <View style={styles.promptIconCircle}>
              <Ionicons name="sparkles" size={28} color={COLORS.orange} />
            </View>
          </View>
          <Text style={styles.promptTitle}>Show Your Game Day Spirit!</Text>
          <Text style={styles.promptInstructions}>
            Snap a photo showing off your school pride -- jerseys, face paint, signs, tailgate
            setups, or your crew in the stands. The more spirit, the better!
          </Text>
        </View>

        {/* Photo Preview or Picker Buttons */}
        {selectedImage ? (
          <View style={styles.previewSection}>
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={handleRemovePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.offWhite} />
              </TouchableOpacity>
            </View>
            <Text style={styles.previewHint}>Tap the X to choose a different photo</Text>
          </View>
        ) : (
          <View style={styles.pickerSection}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.pickerButtonIconCircle}>
                <Ionicons name="camera" size={28} color={COLORS.offWhite} />
              </View>
              <Text style={styles.pickerButtonTitle}>Take Photo</Text>
              <Text style={styles.pickerButtonSubtitle}>Use your camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={styles.pickerButtonIconCircle}>
                <Ionicons name="images" size={28} color={COLORS.offWhite} />
              </View>
              <Text style={styles.pickerButtonTitle}>Choose from Gallery</Text>
              <Text style={styles.pickerButtonSubtitle}>Pick an existing photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for a great photo</Text>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.tipText}>Show your team colors and gear</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.tipText}>Include friends or the stadium atmosphere</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.tipText}>Good lighting makes all the difference</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Submit Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !selectedImage && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedImage || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Photo</Text>
          )}
        </TouchableOpacity>
        {!selectedImage && (
          <Text style={styles.helperText}>
            Take or choose a photo to submit
          </Text>
        )}
      </View>
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
    color: COLORS.offWhite,
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
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  promptCard: {
    backgroundColor: COLORS.navyMid,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  promptIconRow: {
    marginBottom: 16,
  },
  promptIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,107,53,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.offWhite,
    textAlign: 'center',
    marginBottom: 10,
  },
  promptInstructions: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  pickerSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: COLORS.navyMid,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.navyLight,
  },
  pickerButtonIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pickerButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.offWhite,
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerButtonSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.navyMid,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHint: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 10,
  },
  tipsCard: {
    backgroundColor: COLORS.navyMid,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
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
    color: COLORS.gray,
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  completedBadgeText: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: '700',
  },
  completedPhotoContainer: {
    width: 260,
    height: 195,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: COLORS.navyMid,
  },
  completedPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  completedOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedPlaceholder: {
    width: 260,
    height: 195,
    borderRadius: 16,
    backgroundColor: COLORS.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  completedPlaceholderText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  completedTitle: {
    color: COLORS.offWhite,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completedSubtitle: {
    color: COLORS.gray,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: COLORS.navyMid,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    color: COLORS.offWhite,
    fontSize: 17,
    fontWeight: '700',
  },
  celebrationCheckmark: {
    marginBottom: 16,
  },
  celebrationPoints: {
    color: COLORS.orange,
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
  },
  celebrationTitle: {
    color: COLORS.offWhite,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    color: COLORS.gray,
    fontSize: 15,
    textAlign: 'center',
  },
});
