import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a40',
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shifts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
