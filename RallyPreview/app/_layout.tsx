import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.navy } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}
