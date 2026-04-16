import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

export default function RestaurantScreen() {
  const router = useRouter();
  const { session, setActiveLocation, setMemberType } = useStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name.trim() || !session) return;
    setLoading(true);

    // Check if this manager already used a trial on a previous location
    const { data: existingLocations } = await supabase
      .schema('truvex').from('locations')
      .select('id, trial_ends_at')
      .eq('manager_id', session.user.id);

    const hasUsedTrial = existingLocations?.some(
      (loc: any) => loc.trial_ends_at !== null
    ) ?? false;

    // Only grant a trial to managers who haven't had one before
    const trialEndsAt = hasUsedTrial
      ? null
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: location, error: locError } = await supabase
      .schema('truvex').from('locations')
      .insert({
        name: name.trim(),
        industry_type: 'restaurant',
        manager_id: session.user.id,
        subscription_tier: 'free',
        subscription_status: hasUsedTrial ? 'expired' : 'trialing',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (locError || !location) {
      setLoading(false);
      Alert.alert('Error', locError?.message ?? 'Could not create location');
      return;
    }

    // Add manager as location_member
    await supabase.schema('truvex').from('location_members').insert({
      location_id: location.id,
      user_id: session.user.id,
      member_type: 'manager',
      status: 'active',
    });

    setActiveLocation(location);
    setMemberType('manager');
    setLoading(false);

    router.push('/onboarding/roles');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.title}>What's your restaurant called?</Text>
        <Text style={styles.subtitle}>This is what your workers will see.</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Rustic Table"
          placeholderTextColor="#555"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        <TouchableOpacity
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 16,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    backgroundColor: '#0E7C7B',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A8899',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#fff',
  },
  button: {
    backgroundColor: '#0E7C7B',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
