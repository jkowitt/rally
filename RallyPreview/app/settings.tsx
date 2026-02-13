import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp, type Settings } from '../src/context/AppContext';
import { useAuth } from '../src/context/AuthContext';

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

const USER_TYPE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'student', label: 'Current Student' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'general_fan', label: 'General Fan' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { state: authState, updateProfile } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [savingDemographics, setSavingDemographics] = useState(false);
  const [editName, setEditName] = useState(state.user.name);
  const [editHandle, setEditHandle] = useState(state.user.handle);
  const [editUserType, setEditUserType] = useState(authState.user?.userType || '');
  const [editBirthYear, setEditBirthYear] = useState(authState.user?.birthYear?.toString() || '');
  const [editCity, setEditCity] = useState(authState.user?.residingCity || '');
  const [editState, setEditState] = useState(authState.user?.residingState || '');

  const handleToggle = (key: keyof Settings, value: boolean) => {
    dispatch({ type: 'UPDATE_SETTINGS', key, value });
  };

  const handleEditProfile = () => {
    setEditName(state.user.name);
    setEditHandle(state.user.handle);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const trimmedName = editName.trim();
    const trimmedHandle = editHandle.trim();
    if (trimmedName.length === 0 || trimmedHandle.length === 0) {
      Alert.alert('Invalid Input', 'Name and handle cannot be empty.');
      return;
    }
    dispatch({ type: 'UPDATE_PROFILE', name: trimmedName, handle: trimmedHandle });
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will reset the app to its default state. All your progress, points, and settings will be lost. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => dispatch({ type: 'RESET' }),
        },
      ],
    );
  };

  const renderToggleRow = (
    label: string,
    key: keyof Settings,
    icon: string,
  ) => (
    <View style={styles.settingRow} key={key}>
      <View style={styles.settingRowLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={18} color={COLORS.offWhite} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={state.settings[key]}
        onValueChange={(value) => handleToggle(key, value)}
        trackColor={{ false: COLORS.navyLight, true: COLORS.orange }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={COLORS.navyLight}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.offWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            {isEditingProfile ? (
              <View style={styles.editProfileForm}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <Text style={styles.editLabel}>Handle</Text>
                <TextInput
                  style={styles.textInput}
                  value={editHandle}
                  onChangeText={setEditHandle}
                  placeholder="Enter your handle"
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveProfile}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveProfile}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {state.user.avatarInitial}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{state.user.name}</Text>
                  <Text style={styles.profileHandle}>{state.user.handle}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={handleEditProfile}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color={COLORS.orange} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Demographics Section */}
        {authState.isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About You</Text>
            <View style={styles.card}>
              {isEditingDemographics ? (
                <View style={styles.editProfileForm}>
                  <Text style={styles.editLabel}>I am a...</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {USER_TYPE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: editUserType === opt.value ? COLORS.orange : COLORS.navyLight,
                          borderWidth: 1, borderColor: editUserType === opt.value ? COLORS.orange : COLORS.navy,
                        }}
                        onPress={() => setEditUserType(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: editUserType === opt.value ? '700' : '500' }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.editLabel}>Birth Year</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editBirthYear}
                    onChangeText={setEditBirthYear}
                    placeholder="e.g. 2002"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={styles.editLabel}>City</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="Your city"
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize="words"
                  />
                  <Text style={styles.editLabel}>State</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="Your state"
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setIsEditingDemographics(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        setSavingDemographics(true);
                        const birthYearNum = editBirthYear ? parseInt(editBirthYear, 10) : null;
                        await updateProfile({
                          userType: (editUserType as any) || null,
                          birthYear: birthYearNum && !isNaN(birthYearNum) ? birthYearNum : null,
                          residingCity: editCity.trim() || null,
                          residingState: editState.trim() || null,
                        });
                        setSavingDemographics(false);
                        setIsEditingDemographics(false);
                      }}
                      activeOpacity={0.7}
                      disabled={savingDemographics}
                    >
                      <Text style={styles.saveButtonText}>{savingDemographics ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.aboutRow}>
                    <View style={styles.settingRowLeft}>
                      <View style={styles.settingIcon}>
                        <Ionicons name="person-outline" size={18} color={COLORS.offWhite} />
                      </View>
                      <Text style={styles.settingLabel}>Type</Text>
                    </View>
                    <Text style={styles.aboutValue}>
                      {USER_TYPE_OPTIONS.find((o) => o.value === (authState.user?.userType || ''))?.label || 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.rowDivider} />
                  <View style={styles.aboutRow}>
                    <View style={styles.settingRowLeft}>
                      <View style={styles.settingIcon}>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.offWhite} />
                      </View>
                      <Text style={styles.settingLabel}>Birth Year</Text>
                    </View>
                    <Text style={styles.aboutValue}>{authState.user?.birthYear || 'Not set'}</Text>
                  </View>
                  <View style={styles.rowDivider} />
                  <View style={styles.aboutRow}>
                    <View style={styles.settingRowLeft}>
                      <View style={styles.settingIcon}>
                        <Ionicons name="location-outline" size={18} color={COLORS.offWhite} />
                      </View>
                      <Text style={styles.settingLabel}>Location</Text>
                    </View>
                    <Text style={styles.aboutValue}>
                      {authState.user?.residingCity && authState.user?.residingState
                        ? `${authState.user.residingCity}, ${authState.user.residingState}`
                        : authState.user?.residingCity || authState.user?.residingState || 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.rowDivider} />
                  <TouchableOpacity
                    style={styles.aboutRow}
                    onPress={() => {
                      setEditUserType(authState.user?.userType || '');
                      setEditBirthYear(authState.user?.birthYear?.toString() || '');
                      setEditCity(authState.user?.residingCity || '');
                      setEditState(authState.user?.residingState || '');
                      setIsEditingDemographics(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingRowLeft}>
                      <View style={styles.settingIcon}>
                        <Ionicons name="pencil" size={18} color={COLORS.orange} />
                      </View>
                      <Text style={[styles.settingLabel, { color: COLORS.orange }]}>Edit Demographics</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            {renderToggleRow('Push Notifications', 'pushNotifications', 'notifications-outline')}
            <View style={styles.rowDivider} />
            {renderToggleRow('Gameday Alerts', 'gamedayAlerts', 'megaphone-outline')}
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.card}>
            {renderToggleRow('Sound Effects', 'soundEffects', 'volume-medium-outline')}
            <View style={styles.rowDivider} />
            {renderToggleRow('Haptic Feedback', 'hapticFeedback', 'phone-portrait-outline')}
            <View style={styles.rowDivider} />
            {renderToggleRow('Share Activity', 'shareActivity', 'share-social-outline')}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={styles.settingRowLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.offWhite} />
                </View>
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => router.push('/select-school' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.settingRowLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="school-outline" size={18} color={COLORS.offWhite} />
                </View>
                <Text style={styles.settingLabel}>School</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {state.school && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: state.school.primaryColor }} />
                )}
                <Text style={styles.aboutValue}>
                  {state.school?.name || 'Not Selected'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerDescription}>
              This will reset all app data including your points, rewards, and settings to their defaults.
            </Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleClearData}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  /* Section */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitleDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  /* Card */
  card: {
    backgroundColor: COLORS.navyMid,
    borderRadius: 14,
    padding: 4,
  },

  /* Profile */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 2,
  },
  profileHandle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.orange,
  },

  /* Edit Profile Form */
  editProfileForm: {
    padding: 12,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 6,
    marginLeft: 2,
  },
  textInput: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.offWhite,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.navy,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.navyLight,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Toggle Rows */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.offWhite,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.navy,
    marginLeft: 58,
  },

  /* About */
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },

  /* Danger Zone */
  dangerCard: {
    backgroundColor: COLORS.navyMid,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  dangerDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 19,
    marginBottom: 14,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Bottom Spacer */
  bottomSpacer: {
    height: 40,
  },
});
