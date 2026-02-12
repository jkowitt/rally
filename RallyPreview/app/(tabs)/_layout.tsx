import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';

const GRAY = '#8B95A5';
const NAVY_MID = '#1C2842';
const DEFAULT_ACCENT = '#FF6B35';

const TAB_ITEMS: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'gameday', title: 'Gameday', icon: 'american-football' },
  { name: 'rewards', title: 'Rewards', icon: 'gift' },
  { name: 'profile', title: 'Profile', icon: 'person' },
];

export default function TabLayout() {
  const { state } = useApp();
  const accent = state.school?.primaryColor || DEFAULT_ACCENT;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
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
      {TAB_ITEMS.map((tab) => (
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
