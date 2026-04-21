import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_WIDTH = SCREEN_WIDTH - 64;
const TITLE_FONT_SIZE = SCREEN_WIDTH < 380 ? 20 : 24;

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
    fontSize: TITLE_FONT_SIZE,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    width: CONTENT_WIDTH,
  },
  body: {
    fontSize: 15,
    color: '#7A8899',
    lineHeight: 22,
    marginBottom: 16,
    width: CONTENT_WIDTH,
  },
  primaryButton: {
    backgroundColor: '#0E7C7B',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 180,
    textAlign: 'center',
  },
  secondaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#7A8899',
    fontSize: 15,
    minWidth: 80,
    textAlign: 'center',
  },
});
