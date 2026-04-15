import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ManagerLayout() {
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
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
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
      {/* Modal screens — hidden from tab bar */}
      <Tabs.Screen name="post-callout" options={{ href: null }} />
      <Tabs.Screen name="callout/[id]" options={{ href: null }} />
      <Tabs.Screen name="team/add" options={{ href: null }} />
      <Tabs.Screen name="team/[id]" options={{ href: null }} />
    </Tabs>
  );
}
