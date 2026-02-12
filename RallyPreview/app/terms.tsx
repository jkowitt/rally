import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../src/theme/colors';

interface TermsSection {
  title: string;
  body: string;
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By downloading, installing, or using the Rally mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not access or use the App. Rally is owned and operated by Van Wagner Sports & Entertainment ("Company," "we," "us," or "our"). We reserve the right to update or modify these Terms at any time, and your continued use of the App following any changes constitutes your acceptance of the revised Terms.',
  },
  {
    title: '2. User Accounts & Registration',
    body: 'To access certain features of the App, you must create an account by providing accurate and complete information, including your name, email address, and a unique handle. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 13 years of age to create an account. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.',
  },
  {
    title: '3. Fan Engagement Features',
    body: 'The App provides fan engagement features including, but not limited to, loyalty points accumulation, tier-based rewards, gameday activations, predictions, trivia, noise meter challenges, and check-in rewards. Points are earned through participation in App activities and attending supported collegiate athletic events. Points have no monetary value and cannot be transferred, sold, or exchanged for cash. Reward availability is subject to change, and we reserve the right to modify point values, tier thresholds, and reward offerings at any time. Redemption of rewards is subject to availability and may be limited by venue, event, or promotional period.',
  },
  {
    title: '4. Content Submissions',
    body: 'You may submit content through the App, including photos, predictions, trivia responses, and poll votes ("User Content"). By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free, perpetual license to use, reproduce, modify, distribute, and display such content in connection with the App and our promotional activities. You represent that you own or have the necessary rights to submit User Content and that it does not infringe upon the rights of any third party. We reserve the right to remove any User Content that violates these Terms or is deemed inappropriate, offensive, or harmful.',
  },
  {
    title: '5. Privacy & Data Collection',
    body: 'Your privacy is important to us. We collect and process personal information in accordance with our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to the collection of data including location information (for gameday check-ins and geofencing), device information, usage analytics, and interaction data. Location data is used solely for verifying event attendance and enabling location-based features. You may disable location services at any time through your device settings, though this may limit certain App features. We implement industry-standard security measures to protect your data and do not sell personal information to third parties.',
  },
  {
    title: '6. Email Communications & Notifications',
    body: 'By creating an account, you agree to receive periodic email communications from Rally, including but not limited to: gameday alerts and reminders, loyalty points and rewards updates, new feature announcements, promotional offers from Rally and its partners, and weekly engagement summaries. Emails will be sent to the address associated with your account. You may opt out of non-essential email communications at any time by navigating to Settings > Notifications within the App or by clicking the "Unsubscribe" link in any email. Please note that transactional emails (account verification, password resets, security alerts) cannot be disabled as they are required for account security and functionality.',
  },
  {
    title: '7. Push Notifications',
    body: 'The App may send push notifications to your device, including real-time gameday updates, check-in reminders, reward redemption confirmations, leaderboard changes, and promotional alerts. By enabling push notifications during registration or in your device settings, you consent to receiving these notifications. You may disable push notifications at any time through your device settings (Settings > Notifications > Rally) or within the App under Settings > Notifications. Disabling push notifications may affect your ability to receive time-sensitive gameday alerts and check-in reminders.',
  },
  {
    title: '8. Account Security & Verification',
    body: 'All accounts must be verified via email before gaining full access to App features. You are required to provide a valid email address during registration, and a verification code will be sent to confirm ownership. Rally employs industry-standard security measures including encrypted data transmission (TLS/SSL), hashed password storage (bcrypt), JWT-based session authentication, and rate limiting to prevent brute-force attacks. We support account recovery via email-based password reset. You are responsible for maintaining the security of your account credentials and should enable any additional security features offered by the App. Rally reserves the right to implement additional security measures, including multi-factor authentication and suspicious activity monitoring, to protect user accounts.',
  },
  {
    title: '9. Intellectual Property',
    body: 'The App, including its design, logos, text, graphics, software, and all other content, is the property of Van Wagner Sports & Entertainment and is protected by copyright, trademark, and other intellectual property laws. The Rally name, logo, and all related marks are trademarks of Van Wagner Sports & Entertainment. Collegiate athletic team names, logos, and mascots used within the App are the property of their respective institutions and are used under license. You may not copy, reproduce, modify, distribute, or create derivative works from any content within the App without our prior written consent.',
  },
  {
    title: '10. Prohibited Conduct',
    body: 'You agree not to: (a) use the App for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the App or its systems; (c) use automated scripts, bots, or other means to artificially accumulate points or manipulate leaderboard standings; (d) impersonate another person or entity; (e) submit false or misleading information; (f) interfere with or disrupt the App or its servers; (g) harass, abuse, or harm other users; or (h) violate any applicable local, state, national, or international law or regulation.',
  },
  {
    title: '11. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, VAN WAGNER SPORTS & ENTERTAINMENT AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE APP. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US, IF ANY, IN THE TWELVE (12) MONTHS PRIOR TO THE CLAIM. THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.',
  },
  {
    title: '12. Indemnification',
    body: 'You agree to indemnify, defend, and hold harmless Van Wagner Sports & Entertainment and its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising from or relating to your use of the App, your User Content, or your violation of these Terms.',
  },
  {
    title: '13. Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in New York County, New York. Any cause of action arising out of or related to the App must be commenced within one (1) year after the cause of action accrues.',
  },
  {
    title: '14. Termination',
    body: 'We may terminate or suspend your account and access to the App at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the App will immediately cease, and any accumulated points or unredeemed rewards will be forfeited. Provisions of these Terms that by their nature should survive termination shall remain in effect.',
  },
  {
    title: '15. Contact Information',
    body: 'If you have any questions about these Terms and Conditions, please contact us at:\n\nVan Wagner Sports & Entertainment\nRally Fan Engagement Platform\nEmail: support@rallyfanapp.com\nAddress: 5 Bryant Park, New York, NY 10018\n\nFor account-related inquiries, you may also reach us through the Help section within the App.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accept?: string }>();
  const showAcceptButton = params.accept === 'true';

  const handleAccept = () => {
    router.replace('/select-school');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.offWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="document-text-outline" size={24} color={Colors.orange} />
          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>Rally Fan Engagement Platform</Text>
            <Text style={styles.introSubtitle}>
              Please read these terms carefully before using the app.
            </Text>
          </View>
        </View>

        <Text style={styles.lastUpdated}>Last updated: February 1, 2026</Text>

        {/* Sections */}
        {TERMS_SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Bottom padding for accept button */}
        {showAcceptButton && <View style={{ height: 80 }} />}
      </ScrollView>

      {/* Accept Button */}
      {showAcceptButton && (
        <View style={styles.acceptContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.acceptButtonText}>I Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
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
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.offWhite,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Intro Card
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: 2,
  },
  introSubtitle: {
    fontSize: 13,
    color: Colors.gray,
  },

  // Last Updated
  lastUpdated: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 24,
    fontStyle: 'italic',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.offWhite,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
  },

  // Accept Button
  acceptContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: Colors.navy,
    borderTopWidth: 1,
    borderTopColor: Colors.navyLight,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: Colors.orange,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
