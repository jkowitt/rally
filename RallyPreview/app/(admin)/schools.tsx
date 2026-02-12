import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SCHOOLS, type Division } from '../../src/data/schools';

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const NAVY_LIGHT = '#243052';
const ORANGE = '#FF6B35';
const BLUE = '#2D9CDB';
const OFF_WHITE = '#F5F7FA';
const GRAY = '#8B95A5';
const SUCCESS = '#34C759';

type FilterTab = 'All' | 'D1' | 'D2';

// Mock content counts for schools
const CONTENT_COUNTS: Record<string, string> = {
  'kent-state': '3 banners, 1 video',
  'boston-college': '2 banners, 2 videos',
  'temple': '1 banner, 1 video',
  'arizona-state': '4 banners, 3 videos',
  'coastal-carolina': '2 banners',
  'fiu': '1 banner, 1 video',
  'liberty': '3 banners, 2 videos',
  'stony-brook': '1 banner',
  'towson': '2 banners, 1 video',
  'furman': '1 banner',
};

// Mock active status
const INACTIVE_SCHOOLS = ['bluefield-state', 'shaw', 'livingstone', 'lincoln-pa'];

interface AddSchoolForm {
  name: string;
  shortName: string;
  mascot: string;
  conference: string;
  city: string;
  state: string;
  division: Division;
  primaryColor: string;
  contactEmail: string;
}

const EMPTY_SCHOOL_FORM: AddSchoolForm = {
  name: '',
  shortName: '',
  mascot: '',
  conference: '',
  city: '',
  state: '',
  division: 'D1',
  primaryColor: '#FF6B35',
  contactEmail: '',
};

export default function SchoolManagement() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('All');
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState<AddSchoolForm>(EMPTY_SCHOOL_FORM);
  const [addedSchools, setAddedSchools] = useState<typeof SCHOOLS>([]);

  const allSchools = useMemo(() => [...SCHOOLS, ...addedSchools], [addedSchools]);

  const d1Count = allSchools.filter((s) => s.division === 'D1').length;
  const d2Count = allSchools.filter((s) => s.division === 'D2').length;

  const handleAddSchool = () => {
    if (!schoolForm.name.trim() || !schoolForm.shortName.trim()) {
      Alert.alert('Missing Fields', 'Please enter at least a school name and short name.');
      return;
    }
    const newSchool = {
      id: schoolForm.shortName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: schoolForm.name.trim(),
      shortName: schoolForm.shortName.trim(),
      mascot: schoolForm.mascot.trim() || 'TBD',
      conference: schoolForm.conference.trim() || 'Independent',
      city: schoolForm.city.trim() || '',
      state: schoolForm.state.trim() || '',
      division: schoolForm.division,
      primaryColor: schoolForm.primaryColor || '#FF6B35',
      secondaryColor: '#FFFFFF',
    };
    setAddedSchools((prev) => [newSchool, ...prev]);
    setShowAddSchool(false);
    setSchoolForm(EMPTY_SCHOOL_FORM);
    Alert.alert('School Added', `${newSchool.name} has been added to the platform.${schoolForm.contactEmail ? `\n\nInvitation sent to ${schoolForm.contactEmail}.` : ''}`);
  };

  const filteredSchools = useMemo(() => {
    let results = allSchools;
    if (filter !== 'All') {
      results = results.filter((s) => s.division === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.mascot.toLowerCase().includes(q) ||
          s.conference.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q)
      );
    }
    return results;
  }, [search, filter]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Bar + Add Button */}
        <View style={styles.statsRow}>
          <View style={[styles.statsBar, { flex: 1, marginBottom: 0 }]}>
            <Text style={styles.statsText}>
              <Text style={styles.statsHighlight}>{allSchools.length}</Text> Schools
              {'  '}
              <Text style={{ color: GRAY }}>{'\u00B7'}</Text>
              {'  '}
              <Text style={styles.statsHighlight}>{d1Count}</Text> D1
              {'  '}
              <Text style={{ color: GRAY }}>{'\u00B7'}</Text>
              {'  '}
              <Text style={styles.statsHighlight}>{d2Count}</Text> D2
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addSchoolBtn}
            onPress={() => setShowAddSchool(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={16} color="#FFF" />
            <Text style={styles.addSchoolBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Add School Modal */}
        <Modal visible={showAddSchool} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add / Invite School</Text>
                  <TouchableOpacity onPress={() => setShowAddSchool(false)}>
                    <Ionicons name="close" size={22} color={GRAY} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>School Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="University of Example"
                  placeholderTextColor={GRAY}
                  value={schoolForm.name}
                  onChangeText={(v) => setSchoolForm((p) => ({ ...p, name: v }))}
                />

                <Text style={styles.fieldLabel}>Short Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Example"
                  placeholderTextColor={GRAY}
                  value={schoolForm.shortName}
                  onChangeText={(v) => setSchoolForm((p) => ({ ...p, shortName: v }))}
                />

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Mascot</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Eagles"
                      placeholderTextColor={GRAY}
                      value={schoolForm.mascot}
                      onChangeText={(v) => setSchoolForm((p) => ({ ...p, mascot: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Conference</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Big 12"
                      placeholderTextColor={GRAY}
                      value={schoolForm.conference}
                      onChangeText={(v) => setSchoolForm((p) => ({ ...p, conference: v }))}
                    />
                  </View>
                </View>

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="City"
                      placeholderTextColor={GRAY}
                      value={schoolForm.city}
                      onChangeText={(v) => setSchoolForm((p) => ({ ...p, city: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="ST"
                      placeholderTextColor={GRAY}
                      value={schoolForm.state}
                      onChangeText={(v) => setSchoolForm((p) => ({ ...p, state: v }))}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Division</Text>
                <View style={styles.divisionRow}>
                  {(['D1', 'D2'] as Division[]).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.divisionChip,
                        schoolForm.division === d && { backgroundColor: d === 'D1' ? BLUE : ORANGE },
                      ]}
                      onPress={() => setSchoolForm((p) => ({ ...p, division: d }))}
                    >
                      <Text
                        style={[
                          styles.divisionChipText,
                          schoolForm.division === d && { color: '#FFF' },
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Contact Email (sends invite)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="athletics@example.edu"
                  placeholderTextColor={GRAY}
                  value={schoolForm.contactEmail}
                  onChangeText={(v) => setSchoolForm((p) => ({ ...p, contactEmail: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAddSchool}
                  activeOpacity={0.7}
                >
                  <Ionicons name="school" size={16} color="#FFF" />
                  <Text style={styles.submitBtnText}>Add School & Send Invite</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search schools..."
            placeholderTextColor={GRAY}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Division Filter Tabs */}
        <View style={styles.filterRow}>
          {(['All', 'D1', 'D2'] as FilterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <Text style={styles.resultCount}>{filteredSchools.length} results</Text>
        </View>

        {/* School List */}
        {filteredSchools.map((school) => {
          const isActive = !INACTIVE_SCHOOLS.includes(school.id);
          const contentCount = CONTENT_COUNTS[school.id] || 'No content';

          return (
            <View key={school.id} style={styles.schoolCard}>
              <View style={[styles.schoolColorBar, { backgroundColor: school.primaryColor }]} />
              <View style={styles.schoolContent}>
                <View style={styles.schoolTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.schoolNameRow}>
                      <Text style={styles.schoolName} numberOfLines={1}>
                        {school.shortName}
                      </Text>
                      <View
                        style={[
                          styles.divisionBadge,
                          { backgroundColor: school.division === 'D1' ? BLUE + '20' : ORANGE + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.divisionText,
                            { color: school.division === 'D1' ? BLUE : ORANGE },
                          ]}
                        >
                          {school.division}
                        </Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: isActive ? SUCCESS : GRAY }]} />
                    </View>
                    <Text style={styles.schoolMascot}>{school.mascot}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => router.push(`/school-admin?schoolId=${school.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.manageBtnText}>Manage</Text>
                    <Ionicons name="chevron-forward" size={14} color={ORANGE} />
                  </TouchableOpacity>
                </View>
                <View style={styles.schoolMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="trophy" size={12} color={GRAY} />
                    <Text style={styles.metaText}>{school.conference}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={12} color={GRAY} />
                    <Text style={styles.metaText}>
                      {school.city}, {school.state}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="document-text" size={12} color={GRAY} />
                    <Text style={styles.metaText}>{contentCount}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
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

  /* Stats Bar */
  statsBar: {
    backgroundColor: NAVY_MID,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: GRAY,
  },
  statsHighlight: {
    color: OFF_WHITE,
    fontWeight: '700',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY_MID,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: OFF_WHITE,
    padding: 0,
  },

  /* Filter Tabs */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: NAVY_MID,
  },
  filterTabActive: {
    backgroundColor: ORANGE,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  resultCount: {
    fontSize: 12,
    color: GRAY,
  },

  /* School Card */
  schoolCard: {
    flexDirection: 'row',
    backgroundColor: NAVY_MID,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  schoolColorBar: {
    width: 4,
  },
  schoolContent: {
    flex: 1,
    padding: 12,
  },
  schoolTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  schoolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  schoolMascot: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
  },
  divisionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  divisionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ORANGE,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addSchoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addSchoolBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: NAVY_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: OFF_WHITE,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  divisionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  divisionChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: NAVY_LIGHT,
  },
  divisionChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* School Meta */
  schoolMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: GRAY,
  },
});
