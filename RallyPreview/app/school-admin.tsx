import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SCHOOLS } from '../src/data/schools';

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const NAVY_LIGHT = '#243052';
const ORANGE = '#FF6B35';
const BLUE = '#2D9CDB';
const OFF_WHITE = '#F5F7FA';
const GRAY = '#8B95A5';
const SUCCESS = '#34C759';
const ERROR = '#FF3B30';

type Section = 'banners' | 'videos' | 'splash' | 'rewards' | 'settings';

interface BannerAd {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  order: number;
}

interface Video {
  id: string;
  title: string;
  duration: string;
  active: boolean;
}

interface Reward {
  id: string;
  name: string;
  points: number;
  icon: string;
  active: boolean;
}

export default function SchoolAdminScreen() {
  const router = useRouter();
  const { schoolId } = useLocalSearchParams<{ schoolId: string }>();
  const school = SCHOOLS.find((s) => s.id === schoolId);

  const [activeSection, setActiveSection] = useState<Section>('banners');

  // Banner state
  const [banners, setBanners] = useState<BannerAd[]>([
    { id: 'b1', title: 'Homecoming Weekend Sale', imageUrl: 'https://example.com/homecoming.jpg', linkUrl: 'https://example.com/sale', active: true, order: 1 },
    { id: 'b2', title: 'Student Section Promo', imageUrl: 'https://example.com/student.jpg', linkUrl: 'https://example.com/students', active: true, order: 2 },
    { id: 'b3', title: 'Season Ticket Packages', imageUrl: 'https://example.com/tickets.jpg', linkUrl: 'https://example.com/tickets', active: false, order: 3 },
  ]);

  // Video state
  const [videos, setVideos] = useState<Video[]>([
    { id: 'v1', title: 'Game Day Hype Reel', duration: '1:30', active: true },
    { id: 'v2', title: 'Coach Interview - Week 4', duration: '3:45', active: true },
  ]);

  // Splash state
  const [splash, setSplash] = useState({
    bgColor: school?.primaryColor || '#002664',
    tagline: `Welcome to ${school?.shortName || 'Rally'}!`,
    ctaText: 'Get Started',
  });

  // Rewards state
  const [rewards, setRewards] = useState<Reward[]>([
    { id: 'r1', name: 'Rally T-Shirt', points: 500, icon: 'shirt', active: true },
    { id: 'r2', name: '$5 Concessions Credit', points: 300, icon: 'fast-food', active: true },
    { id: 'r3', name: 'VIP Parking Pass', points: 1000, icon: 'car', active: true },
    { id: 'r4', name: 'Meet & Greet', points: 2000, icon: 'people', active: false },
  ]);

  // Settings state
  const [settings, setSettings] = useState({
    displayName: school?.name || '',
    primaryColor: school?.primaryColor || '#002664',
    secondaryColor: school?.secondaryColor || '#EAAB00',
    contactEmail: `athletics@${school?.id || 'school'}.edu`,
    twitter: `@${school?.shortName?.replace(/[^a-zA-Z]/g, '') || 'school'}Athletics`,
    instagram: `@${school?.shortName?.replace(/[^a-zA-Z]/g, '') || 'school'}Sports`,
  });

  if (!school) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={ERROR} />
          <Text style={styles.errorTitle}>School Not Found</Text>
          <Text style={styles.errorText}>
            No school found with ID: "{schoolId}"
          </Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  const toggleVideo = (id: string) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v))
    );
  };

  const toggleReward = (id: string) => {
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const SECTIONS: { key: Section; label: string; icon: string }[] = [
    { key: 'banners', label: 'Banners', icon: 'image' },
    { key: 'videos', label: 'Videos', icon: 'videocam' },
    { key: 'splash', label: 'Splash', icon: 'phone-portrait' },
    { key: 'rewards', label: 'Rewards', icon: 'gift' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const renderBanners = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Banner Ads ({banners.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Banner', 'Banner creation form coming soon.')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Banner</Text>
        </TouchableOpacity>
      </View>
      {banners.map((banner) => (
        <View key={banner.id} style={styles.contentCard}>
          <View style={styles.contentImagePlaceholder}>
            <Ionicons name="image" size={28} color={GRAY} />
            <Text style={styles.placeholderText}>Banner Image</Text>
          </View>
          <View style={styles.contentInfo}>
            <View style={styles.contentTitleRow}>
              <Text style={styles.contentTitle} numberOfLines={1}>{banner.title}</Text>
              <Switch
                value={banner.active}
                onValueChange={() => toggleBanner(banner.id)}
                trackColor={{ false: NAVY_LIGHT, true: SUCCESS + '60' }}
                thumbColor={banner.active ? SUCCESS : GRAY}
              />
            </View>
            <Text style={styles.contentMeta}>Order: #{banner.order}</Text>
            <Text style={styles.contentUrl} numberOfLines={1}>{banner.linkUrl}</Text>
            <View style={styles.contentActions}>
              <TouchableOpacity style={styles.contentActionBtn} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={14} color={BLUE} />
                <Text style={[styles.contentActionText, { color: BLUE }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contentActionBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Delete', `Delete "${banner.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive' },
                ])}
              >
                <Ionicons name="trash-outline" size={14} color={ERROR} />
                <Text style={[styles.contentActionText, { color: ERROR }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderVideos = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Video', 'Video upload form coming soon.')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Video</Text>
        </TouchableOpacity>
      </View>
      {videos.map((video) => (
        <View key={video.id} style={styles.contentCard}>
          <View style={[styles.contentImagePlaceholder, { backgroundColor: NAVY_LIGHT }]}>
            <Ionicons name="play-circle" size={32} color={ORANGE} />
          </View>
          <View style={styles.contentInfo}>
            <View style={styles.contentTitleRow}>
              <Text style={styles.contentTitle} numberOfLines={1}>{video.title}</Text>
              <Switch
                value={video.active}
                onValueChange={() => toggleVideo(video.id)}
                trackColor={{ false: NAVY_LIGHT, true: SUCCESS + '60' }}
                thumbColor={video.active ? SUCCESS : GRAY}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time" size={12} color={GRAY} />
              <Text style={styles.contentMeta}>Duration: {video.duration}</Text>
            </View>
            <View style={styles.contentActions}>
              <TouchableOpacity style={styles.contentActionBtn} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={14} color={BLUE} />
                <Text style={[styles.contentActionText, { color: BLUE }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contentActionBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Delete', `Delete "${video.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive' },
                ])}
              >
                <Ionicons name="trash-outline" size={14} color={ERROR} />
                <Text style={[styles.contentActionText, { color: ERROR }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSplash = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Splash Page</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: BLUE }]}
          onPress={() => Alert.alert('Saved', 'Splash page configuration saved.')}
          activeOpacity={0.7}
        >
          <Ionicons name="save" size={14} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={[styles.splashPreview, { backgroundColor: splash.bgColor }]}>
        <View style={styles.splashLogoPlaceholder}>
          <Text style={styles.splashLogoText}>{school.shortName}</Text>
        </View>
        <Text style={styles.splashTagline}>{splash.tagline}</Text>
        <View style={styles.splashCta}>
          <Text style={styles.splashCtaText}>{splash.ctaText}</Text>
        </View>
        <Text style={styles.previewLabel}>Preview</Text>
      </View>

      {/* Config */}
      <View style={styles.configCard}>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Background Color</Text>
          <View style={styles.colorInputRow}>
            <View style={[styles.colorSwatch, { backgroundColor: splash.bgColor }]} />
            <TextInput
              style={styles.configInput}
              value={splash.bgColor}
              onChangeText={(v) => setSplash({ ...splash, bgColor: v })}
              placeholderTextColor={GRAY}
            />
          </View>
        </View>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Tagline</Text>
          <TextInput
            style={styles.configInput}
            value={splash.tagline}
            onChangeText={(v) => setSplash({ ...splash, tagline: v })}
            placeholderTextColor={GRAY}
          />
        </View>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>CTA Button Text</Text>
          <TextInput
            style={styles.configInput}
            value={splash.ctaText}
            onChangeText={(v) => setSplash({ ...splash, ctaText: v })}
            placeholderTextColor={GRAY}
          />
        </View>
      </View>
    </View>
  );

  const renderRewards = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rewards ({rewards.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Reward', 'Reward creation form coming soon.')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Reward</Text>
        </TouchableOpacity>
      </View>
      {rewards.map((reward) => (
        <View key={reward.id} style={styles.rewardCard}>
          <View style={styles.rewardIconWrap}>
            <Ionicons name={reward.icon as any} size={22} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardName}>{reward.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={12} color={BLUE} />
              <Text style={styles.rewardPoints}>{reward.points.toLocaleString()} pts</Text>
            </View>
          </View>
          <Switch
            value={reward.active}
            onValueChange={() => toggleReward(reward.id)}
            trackColor={{ false: NAVY_LIGHT, true: SUCCESS + '60' }}
            thumbColor={reward.active ? SUCCESS : GRAY}
          />
        </View>
      ))}
    </View>
  );

  const renderSettings = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>School Settings</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: SUCCESS }]}
          onPress={() => Alert.alert('Saved', 'Settings saved successfully.')}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.configCard}>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Display Name</Text>
          <TextInput
            style={styles.configInput}
            value={settings.displayName}
            onChangeText={(v) => setSettings({ ...settings, displayName: v })}
            placeholderTextColor={GRAY}
          />
        </View>

        <View style={styles.configField}>
          <Text style={styles.configLabel}>Primary Color</Text>
          <View style={styles.colorInputRow}>
            <View style={[styles.colorSwatch, { backgroundColor: settings.primaryColor }]} />
            <TextInput
              style={styles.configInput}
              value={settings.primaryColor}
              onChangeText={(v) => setSettings({ ...settings, primaryColor: v })}
              placeholderTextColor={GRAY}
            />
          </View>
        </View>

        <View style={styles.configField}>
          <Text style={styles.configLabel}>Secondary Color</Text>
          <View style={styles.colorInputRow}>
            <View style={[styles.colorSwatch, { backgroundColor: settings.secondaryColor }]} />
            <TextInput
              style={styles.configInput}
              value={settings.secondaryColor}
              onChangeText={(v) => setSettings({ ...settings, secondaryColor: v })}
              placeholderTextColor={GRAY}
            />
          </View>
        </View>

        <View style={styles.configField}>
          <Text style={styles.configLabel}>Contact Email</Text>
          <TextInput
            style={styles.configInput}
            value={settings.contactEmail}
            onChangeText={(v) => setSettings({ ...settings, contactEmail: v })}
            keyboardType="email-address"
            placeholderTextColor={GRAY}
          />
        </View>

        <View style={styles.configField}>
          <Text style={styles.configLabel}>Twitter</Text>
          <TextInput
            style={styles.configInput}
            value={settings.twitter}
            onChangeText={(v) => setSettings({ ...settings, twitter: v })}
            placeholderTextColor={GRAY}
          />
        </View>

        <View style={styles.configField}>
          <Text style={styles.configLabel}>Instagram</Text>
          <TextInput
            style={styles.configInput}
            value={settings.instagram}
            onChangeText={(v) => setSettings({ ...settings, instagram: v })}
            placeholderTextColor={GRAY}
          />
        </View>
      </View>
    </View>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'banners': return renderBanners();
      case 'videos': return renderVideos();
      case 'splash': return renderSplash();
      case 'rewards': return renderRewards();
      case 'settings': return renderSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.headerBar, { borderBottomColor: school.primaryColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={OFF_WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{school.name}</Text>
            <Text style={styles.headerSubtitle}>Content Management</Text>
          </View>
          <View style={[styles.headerColorDot, { backgroundColor: school.primaryColor }]} />
        </View>

        {/* School Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="paw" size={14} color={ORANGE} />
              <Text style={styles.infoLabel}>Mascot</Text>
              <Text style={styles.infoValue}>{school.mascot}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="trophy" size={14} color={BLUE} />
              <Text style={styles.infoLabel}>Conference</Text>
              <Text style={styles.infoValue}>{school.conference}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield" size={14} color={SUCCESS} />
              <Text style={styles.infoLabel}>Division</Text>
              <Text style={styles.infoValue}>{school.division}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={14} color={GRAY} />
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{school.city}, {school.state}</Text>
            </View>
          </View>
          <View style={styles.colorSwatches}>
            <View style={styles.swatchItem}>
              <View style={[styles.swatchColor, { backgroundColor: school.primaryColor }]} />
              <Text style={styles.swatchHex}>{school.primaryColor}</Text>
            </View>
            <View style={styles.swatchItem}>
              <View style={[styles.swatchColor, { backgroundColor: school.secondaryColor }]} />
              <Text style={styles.swatchHex}>{school.secondaryColor}</Text>
            </View>
          </View>
        </View>

        {/* Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={{ gap: 6 }}
        >
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec.key}
              style={[styles.sectionTab, activeSection === sec.key && styles.sectionTabActive]}
              onPress={() => setActiveSection(sec.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={sec.icon as any}
                size={16}
                color={activeSection === sec.key ? '#FFFFFF' : GRAY}
              />
              <Text
                style={[styles.sectionTabText, activeSection === sec.key && styles.sectionTabTextActive]}
              >
                {sec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Section Content */}
        {renderSection()}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },

  /* Error State */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  errorText: {
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
  },
  errorBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Header */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderBottomWidth: 3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: NAVY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  headerSubtitle: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
  },
  headerColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: NAVY_LIGHT,
  },

  /* Info Card */
  infoCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: NAVY_LIGHT,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: OFF_WHITE,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  swatchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatchColor: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: NAVY_LIGHT,
  },
  swatchHex: {
    fontSize: 12,
    color: GRAY,
    fontFamily: 'monospace',
  },

  /* Section Tabs */
  sectionTabs: {
    marginBottom: 12,
    flexGrow: 0,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY_MID,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: ORANGE,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY,
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Content Card (banners, videos) */
  contentCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  contentImagePlaceholder: {
    height: 80,
    backgroundColor: NAVY_LIGHT + '80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: GRAY,
    marginTop: 4,
  },
  contentInfo: {
    padding: 12,
  },
  contentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: OFF_WHITE,
    flex: 1,
    marginRight: 8,
  },
  contentMeta: {
    fontSize: 11,
    color: GRAY,
  },
  contentUrl: {
    fontSize: 11,
    color: BLUE,
    marginTop: 2,
  },
  contentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NAVY_LIGHT,
  },
  contentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentActionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Splash Preview */
  splashPreview: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  splashLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  splashLogoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  splashTagline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  splashCta: {
    backgroundColor: ORANGE,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  splashCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewLabel: {
    position: 'absolute',
    top: 8,
    right: 10,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Config Card */
  configCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  configField: {
    gap: 4,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  configInput: {
    backgroundColor: NAVY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: OFF_WHITE,
    flex: 1,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NAVY_LIGHT,
  },

  /* Reward Card */
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY_MID,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rewardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: OFF_WHITE,
  },
  rewardPoints: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '500',
  },
});
