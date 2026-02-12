import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '../src/theme/colors';
import { AppProvider } from '../src/context/AppContext';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <View style={{ flex: 1, backgroundColor: Colors.navy }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.navy } }}>
            {/* Auth screens */}
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="select-school" />

            {/* Main tabs */}
            <Stack.Screen name="(tabs)" />

            {/* Admin panel */}
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="school-admin" />

            {/* Modals */}
            <Stack.Screen name="trivia" options={{ presentation: 'modal' }} />
            <Stack.Screen name="prediction" options={{ presentation: 'modal' }} />
            <Stack.Screen name="noise-meter" options={{ presentation: 'modal' }} />
            <Stack.Screen name="photo-challenge" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reward-detail" options={{ presentation: 'modal' }} />

            {/* Screens */}
            <Stack.Screen name="points-history" />
            <Stack.Screen name="my-rewards" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="help" />
          </Stack>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}
