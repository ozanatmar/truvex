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

function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;

  async function handleSendOtp() {
    if (!isValid) return;
    setLoading(true);

    const e164 = `+1${digits}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push({ pathname: '/(auth)/verify', params: { phone: e164 } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Truvex</Text>
        <Text style={styles.tagline}>Shift coverage, solved.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.inputRow}>
            <Text style={styles.countryCode}>+1</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(v) => setPhone(formatUSPhone(v))}
              placeholder="(555) 555-5555"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={14}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send verification code</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            We'll send a 6-digit code to verify your number. US numbers only.
          </Text>
        </View>
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
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0E7C7B',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#7A8899',
    marginBottom: 48,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  countryCode: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.5,
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
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
