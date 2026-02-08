import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { SCHOOLS, searchSchools, type Division, type School } from '../src/data/schools';

const { width } = Dimensions.get('window');

const COLORS = {
  navy: '#131B2E',
  navyMid: '#1C2842',
  navyLight: '#243052',
  orange: '#FF6B35',
  offWhite: '#F5F7FA',
  gray: '#8B95A5',
  blue: '#2D9CDB',
};

const DIVISION_FILTERS: { id: Division | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'D1', label: 'Division I' },
  { id: 'D2', label: 'Division II' },
];

export default function SelectSchoolScreen() {
  const router = useRouter();
  const { dispatch } = useApp();

  const [query, setQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');

  const filtered = useMemo(() => {
    const division = selectedDivision === 'all' ? undefined : selectedDivision;
    return searchSchools(query, division);
  }, [query, selectedDivision]);

  // Group by conference
  const grouped = useMemo(() => {
    const map = new Map<string, School[]>();
    for (const school of filtered) {
      const key = school.conference;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(school);
    }
    // Sort conferences alphabetically
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([conference, schools]) => ({ conference, schools }));
  }, [filtered]);

  const handleSelect = (school: School) => {
    dispatch({ type: 'SELECT_SCHOOL', school });
    router.replace('/(tabs)');
  };

  const renderSchool = (school: School) => (
    <TouchableOpacity
      key={school.id}
      style={styles.schoolRow}
      onPress={() => handleSelect(school)}
      activeOpacity={0.7}
    >
      {/* Color swatch */}
      <View style={[styles.swatch, { backgroundColor: school.primaryColor }]}>
        <Text style={[styles.swatchText, { color: '#FFFFFF' }]}>
          {school.shortName}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.schoolInfo}>
        <Text style={styles.schoolName} numberOfLines={1}>{school.name}</Text>
        <Text style={styles.schoolMeta}>
          {school.mascot} · {school.conference} · {school.division}
        </Text>
        <Text style={styles.schoolLocation}>{school.city}, {school.state}</Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
    </TouchableOpacity>
  );

  const renderSection = ({ item }: { item: { conference: string; schools: School[] } }) => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{item.conference}</Text>
      {item.schools.map(renderSchool)}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/rally-wordmark-white-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Choose Your School</Text>
        <Text style={styles.subtitle}>
          Select your college to personalize your Rally experience
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search schools, conferences, cities..."
            placeholderTextColor={COLORS.gray}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Division Filters */}
      <View style={styles.filtersRow}>
        {DIVISION_FILTERS.map((f) => {
          const active = selectedDivision === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedDivision(f.id)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.filterSpacer} />
        <Text style={styles.countText}>{filtered.length} schools</Text>
      </View>

      {/* School List */}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.conference}
        renderItem={renderSection}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No schools found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or filter
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.offWhite,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyMid,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.offWhite,
  },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.navyMid,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: COLORS.orange,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterChipTextActive: {
    color: COLORS.orange,
  },
  filterSpacer: {
    flex: 1,
  },
  countText: {
    fontSize: 13,
    color: COLORS.gray,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // School Row
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyMid,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  swatchText: {
    fontSize: 14,
    fontWeight: '800',
  },
  schoolInfo: {
    flex: 1,
    marginRight: 8,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 2,
  },
  schoolMeta: {
    fontSize: 12,
    color: COLORS.blue,
    marginBottom: 1,
  },
  schoolLocation: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
});
