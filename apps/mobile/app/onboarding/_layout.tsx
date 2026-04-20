import { Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f0f1a' },
        animation: Platform.OS === 'android' ? 'fade' : 'default',
      }}
    >
      <Stack.Screen name="restaurant" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="first-worker" />
    </Stack>
  );
}
