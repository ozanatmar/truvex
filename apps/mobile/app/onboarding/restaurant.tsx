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

    // Trial-once-per-phone is gated by profiles.trial_used_at inside the
    // create-location Edge Function. Never insert locations directly from
    // the client — scanning existing rows for trial_ends_at doesn't detect
    // a trial that was already consumed and whose location was deleted.
    // Use fetch directly rather than supabase.functions.invoke so the user
    // JWT is the one-and-only Authorization header (invoke was leaking the
    // anon key through → 401 on getUser(token)).
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    let data: any = null;
    let status = 0;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/create-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ name: name.trim(), industry_type: 'restaurant' }),
      });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Network error — please try again.');
      return;
    }

    const location = data?.location;
    if (status < 200 || status >= 300 || !location) {
      setLoading(false);
      const message = data?.error ?? `Could not create location (HTTP ${status})`;
      Alert.alert('Error', message);
      return;
    }

    // Edge function seeds default roles but does not add the manager to
    // location_members — do that here so the session sees the new location.
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
    fontWeight: '700',
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
