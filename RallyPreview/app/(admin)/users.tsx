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

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const NAVY_LIGHT = '#243052';
const ORANGE = '#FF6B35';
const BLUE = '#2D9CDB';
const OFF_WHITE = '#F5F7FA';
const GRAY = '#8B95A5';
const SUCCESS = '#34C759';
const ERROR = '#FF3B30';

type Role = 'developer' | 'admin' | 'user';
type FilterRole = 'All' | 'Developers' | 'Admins' | 'Users';

interface UserItem {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: Role;
  school: string;
  lastActive: string;
}

const ROLE_COLORS: Record<Role, string> = {
  developer: ORANGE,
  admin: BLUE,
  user: GRAY,
};

const MOCK_USERS: UserItem[] = [
  { id: '1', name: 'Jason Kowitt', email: 'jason@rally.com', handle: '@jkowitt', role: 'developer', school: 'HQ', lastActive: 'Now' },
  { id: '2', name: 'Mike Chen', email: 'mike@rally.com', handle: '@mchen', role: 'developer', school: 'HQ', lastActive: '5m ago' },
  { id: '3', name: 'Sarah Lin', email: 'sarah@rally.com', handle: '@slin', role: 'developer', school: 'HQ', lastActive: '1h ago' },
  { id: '4', name: 'Rally Admin', email: 'admin@rally.com', handle: '@rallyadmin', role: 'admin', school: 'All Schools', lastActive: '10m ago' },
  { id: '5', name: 'Chris Baker', email: 'chris.b@vanwagner.com', handle: '@cbaker', role: 'admin', school: 'Kent State', lastActive: '30m ago' },
  { id: '6', name: 'Nicole Torres', email: 'nicole@vanwagner.com', handle: '@ntorres', role: 'admin', school: 'Temple', lastActive: '2h ago' },
  { id: '7', name: 'Alex Johnson', email: 'alex.j@kent.edu', handle: '@alexj', role: 'user', school: 'Kent State', lastActive: '15m ago' },
  { id: '8', name: 'Maria Garcia', email: 'maria.g@umass.edu', handle: '@mgarcia', role: 'user', school: 'UMass', lastActive: '1h ago' },
  { id: '9', name: 'James Wilson', email: 'james.w@temple.edu', handle: '@jwilson', role: 'user', school: 'Temple', lastActive: '3h ago' },
  { id: '10', name: 'Emily Davis', email: 'emily.d@bsu.edu', handle: '@edavis', role: 'user', school: 'Ball State', lastActive: '5h ago' },
  { id: '11', name: 'Ryan Thompson', email: 'ryan.t@ccu.edu', handle: '@rthompson', role: 'user', school: 'Coastal Carolina', lastActive: '1d ago' },
  { id: '12', name: 'Ashley Brown', email: 'ashley.b@fiu.edu', handle: '@abrown', role: 'user', school: 'FIU', lastActive: '1d ago' },
  { id: '13', name: 'David Lee', email: 'david.l@niu.edu', handle: '@dlee', role: 'user', school: 'Northern Illinois', lastActive: '2d ago' },
];

const FILTER_MAP: Record<FilterRole, Role | undefined> = {
  All: undefined,
  Developers: 'developer',
  Admins: 'admin',
  Users: 'user',
};

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterRole>('All');
  const [users, setUsers] = useState<UserItem[]>(MOCK_USERS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('user');
  const [inviteSchool, setInviteSchool] = useState('');

  const devCount = users.filter((u) => u.role === 'developer').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.filter((u) => u.role === 'user').length;

  const handleSendInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      Alert.alert('Missing Fields', 'Please enter a name and email address.');
      return;
    }
    const newUser: UserItem = {
      id: `inv-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      handle: `@${inviteName.trim().toLowerCase().replace(/\s+/g, '')}`,
      role: inviteRole,
      school: inviteSchool.trim() || 'Unassigned',
      lastActive: 'Invited',
    };
    setUsers((prev) => [newUser, ...prev]);
    setShowInvite(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('user');
    setInviteSchool('');
    Alert.alert('Invite Sent', `Invitation sent to ${newUser.email} as ${newUser.role}.`);
  };

  const filteredUsers = useMemo(() => {
    let results = users;
    const roleFilter = FILTER_MAP[filter];
    if (roleFilter) {
      results = results.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q) ||
          u.school.toLowerCase().includes(q)
      );
    }
    return results;
  }, [search, filter]);

  const handleRoleChange = (user: UserItem) => {
    Alert.alert(
      'Change Role',
      `Change role for ${user.name}?`,
      [
        { text: 'Developer', onPress: () => Alert.alert('Updated', `${user.name} is now a developer.`) },
        { text: 'Admin', onPress: () => Alert.alert('Updated', `${user.name} is now an admin.`) },
        { text: 'User', onPress: () => Alert.alert('Updated', `${user.name} is now a user.`) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemove = (user: UserItem) => {
    Alert.alert(
      'Remove User',
      `Remove ${user.name} from the platform?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => Alert.alert('Removed', `${user.name} has been removed.`) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Bar + Invite Button */}
        <View style={styles.statsRow}>
          <View style={[styles.statsBar, { flex: 1, marginBottom: 0 }]}>
            <Text style={styles.statsText}>
              <Text style={styles.statsHighlight}>{users.length}</Text> total
              {'  '}
              <Text style={{ color: GRAY }}>{'\u00B7'}</Text>
              {'  '}
              <Text style={{ color: ORANGE, fontWeight: '700' }}>{devCount}</Text>{' '}
              dev
              {'  '}
              <Text style={{ color: GRAY }}>{'\u00B7'}</Text>
              {'  '}
              <Text style={{ color: BLUE, fontWeight: '700' }}>{adminCount}</Text>{' '}
              admin
              {'  '}
              <Text style={{ color: GRAY }}>{'\u00B7'}</Text>
              {'  '}
              <Text style={styles.statsHighlight}>{userCount}</Text> user
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => setShowInvite(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#FFF" />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Invite Modal */}
        <Modal visible={showInvite} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite User</Text>
                <TouchableOpacity onPress={() => setShowInvite(false)}>
                  <Ionicons name="close" size={22} color={GRAY} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Jane Smith"
                placeholderTextColor={GRAY}
                value={inviteName}
                onChangeText={setInviteName}
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="jane@example.com"
                placeholderTextColor={GRAY}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>School (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Kent State"
                placeholderTextColor={GRAY}
                value={inviteSchool}
                onChangeText={setInviteSchool}
              />

              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.roleRow}>
                {(['user', 'admin', 'developer'] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, inviteRole === r && { backgroundColor: ROLE_COLORS[r] }]}
                    onPress={() => setInviteRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        inviteRole === r && { color: '#FFF' },
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.sendInviteBtn}
                onPress={handleSendInvite}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={16} color="#FFF" />
                <Text style={styles.sendInviteBtnText}>Send Invitation</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
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

        {/* Role Filter Chips */}
        <View style={styles.filterRow}>
          {(['All', 'Developers', 'Admins', 'Users'] as FilterRole[]).map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, filter === role && styles.filterChipActive]}
              onPress={() => setFilter(role)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === role && styles.filterChipTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* User List */}
        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userTopRow}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] + '30' }]}>
                <Text style={[styles.avatarText, { color: ROLE_COLORS[user.role] }]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[user.role] }]}>
                      {user.role}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.userMeta}>
                  <Text style={styles.userHandle}>{user.handle}</Text>
                  <Text style={styles.metaSep}>{'\u00B7'}</Text>
                  <Ionicons name="school" size={11} color={GRAY} />
                  <Text style={styles.userSchool}>{user.school}</Text>
                  <Text style={styles.metaSep}>{'\u00B7'}</Text>
                  <Text style={styles.userLastActive}>{user.lastActive}</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleRoleChange(user)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={BLUE} />
                <Text style={styles.editBtnText}>Edit Role</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(user)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color={ERROR} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={GRAY} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}

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
    fontSize: 13,
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

  /* Filter */
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: NAVY_MID,
  },
  filterChipActive: {
    backgroundColor: ORANGE,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* User Card */
  userCard: {
    backgroundColor: NAVY_MID,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: OFF_WHITE,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  userHandle: {
    fontSize: 11,
    color: BLUE,
    fontWeight: '500',
  },
  metaSep: {
    fontSize: 11,
    color: NAVY_LIGHT,
  },
  userSchool: {
    fontSize: 11,
    color: GRAY,
  },
  userLastActive: {
    fontSize: 11,
    color: GRAY,
  },

  /* Actions */
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NAVY_LIGHT,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BLUE,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ERROR + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ERROR,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
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
    marginBottom: 16,
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
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: NAVY_LIGHT,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY,
  },
  sendInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  sendInviteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: GRAY,
  },
});
