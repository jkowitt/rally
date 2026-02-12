import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAVY_MID = '#1C2842';
const ORANGE = '#FF6B35';
const GRAY = '#8B95A5';
const OFF_WHITE = '#F5F7FA';

const ADMIN_TABS: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid' },
  { name: 'schools', title: 'Schools', icon: 'school' },
  { name: 'analytics', title: 'Analytics', icon: 'analytics' },
  { name: 'users', title: 'Users', icon: 'people' },
];

export default function AdminLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: NAVY_MID,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: OFF_WHITE,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: 12,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: 'rgba(255,107,53,0.15)',
              borderRadius: 8,
            }}
          >
            <Ionicons name="arrow-back" size={16} color={ORANGE} />
            <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
              Back to App
            </Text>
          </TouchableOpacity>
        ),
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={18} color={ORANGE} style={{ marginRight: 6 }} />
            <Text style={{ color: OFF_WHITE, fontSize: 17, fontWeight: '700' }}>Rally Admin</Text>
          </View>
        ),
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: NAVY_MID,
          borderTopColor: NAVY_MID,
          borderTopWidth: 0,
          elevation: 0,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          minHeight: 48,
        },
      }}
    >
      {ADMIN_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <Ionicons name={tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
