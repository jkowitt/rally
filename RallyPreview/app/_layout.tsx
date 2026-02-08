import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '../src/theme/colors';
import { AppProvider } from '../src/context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <View style={{ flex: 1, backgroundColor: Colors.navy }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.navy } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trivia" options={{ presentation: 'modal' }} />
          <Stack.Screen name="prediction" options={{ presentation: 'modal' }} />
          <Stack.Screen name="noise-meter" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reward-detail" options={{ presentation: 'modal' }} />
          <Stack.Screen name="points-history" />
          <Stack.Screen name="my-rewards" />
          <Stack.Screen name="notifications" />
        </Stack>
      </View>
    </AppProvider>
  );
}
