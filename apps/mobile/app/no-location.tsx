import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function NoLocationScreen() {
  const router = useRouter();
  const { reset } = useStore();

  async function handleSetupRestaurant() {
    router.push('/onboarding/restaurant');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're not linked to a location</Text>
      <Text style={styles.body}>
        Ask your manager to add you, or set up your own restaurant.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSetupRestaurant}>
        <Text style={styles.primaryButtonText}>Set up my restaurant</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#8888aa',
    lineHeight: 22,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#8888aa',
    fontSize: 15,
  },
});
