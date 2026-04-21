import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WorkerShiftListener from '../../components/WorkerShiftListener';

export default function WorkerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: '#0f0f1a' }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1a1a2e',
            borderTopColor: '#2a2a40',
          },
          tabBarActiveTintColor: '#0E7C7B',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Shifts',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
      <WorkerShiftListener />
    </View>
  );
}
