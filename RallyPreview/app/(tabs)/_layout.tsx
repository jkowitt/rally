import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useApp } from '../../src/context/AppContext';

const GRAY = '#8B95A5';
const NAVY_MID = '#1C2842';
const DEFAULT_ACCENT = '#FF6B35';

export default function TabLayout() {
  const { state } = useApp();
  const accent = state.school?.primaryColor || DEFAULT_ACCENT;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: NAVY_MID,
          borderTopColor: NAVY_MID,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gameday"
        options={{
          title: 'Gameday',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="american-football" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
