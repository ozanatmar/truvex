import { Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f0f1a' },
        animation: Platform.OS === 'android' ? 'fade' : 'default',
      }}
    />
  );
}
