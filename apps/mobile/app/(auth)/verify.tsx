import { useState, useRef } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  async function handleVerify() {
    if (otp.length !== 6) return;
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: phone!,
      token: otp,
      type: 'sms',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Invalid code', 'That code is incorrect or expired. Try again.');
      setOtp('');
      return;
    }

    // Auth state change in _layout.tsx handles routing
  }

  async function handleResend() {
    const { error } = await supabase.auth.signInWithOtp({ phone: phone! });
    if (!error) Alert.alert('Code resent', 'A new code has been sent to your phone.');
  }

  const display = phone?.replace('+1', '') || '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          We texted a 6-digit code to{'\n'}
          <Text style={styles.phoneText}>{display}</Text>
        </Text>

        <TextInput
          ref={inputRef}
          style={styles.otpInput}
          value={otp}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, 6);
            setOtp(digits);
            if (digits.length === 6) {
              // Auto-submit on full entry
              setTimeout(() => handleVerify(), 100);
            }
          }}
          placeholder="000000"
          placeholderTextColor="#555"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={otp.length !== 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend}>
          <Text style={styles.resend}>Resend code</Text>
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
    paddingTop: 60,
  },
  back: {
    marginBottom: 40,
  },
  backText: {
    color: '#8888aa',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888aa',
    lineHeight: 22,
    marginBottom: 40,
  },
  phoneText: {
    color: '#ccc',
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    height: 64,
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resend: {
    color: '#4f46e5',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});
