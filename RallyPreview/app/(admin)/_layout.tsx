import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Text, View } from 'react-native';

const NAVY = '#131B2E';
const NAVY_MID = '#1C2842';
const ORANGE = '#FF6B35';
const GRAY = '#8B95A5';
const OFF_WHITE = '#F5F7FA';

export default function AdminLayout() {
  const router = useRouter();

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
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schools"
        options={{
          title: 'Schools',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
