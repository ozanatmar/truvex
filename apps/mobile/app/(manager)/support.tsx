import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

const SUPPORT_EMAIL = 'support@truvex.app';

export default function SupportScreen() {
  const { activeLocation, session } = useStore();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const tier = (activeLocation as any)?.subscription_tier ?? 'free';

  async function handleSubmit() {
    if (!message.trim() || !activeLocation || !session) return;
    setLoading(true);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-support`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ location_id: activeLocation.id, message }),
      },
    );

    setLoading(false);

    if (res.ok) {
      setMessage('');
      Alert.alert('Message sent', 'We\'ll get back to you shortly.');
    } else {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }

  // Free tier — gate
  if (tier === 'free') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
        </View>
        <View style={styles.gateContainer}>
          <Text style={styles.gateIcon}>💬</Text>
          <Text style={styles.gateTitle}>Upgrade for support</Text>
          <Text style={styles.gateBody}>
            Direct support is available on Pro and Business plans. Free plan users can find help at truvex.app/help.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://truvex.app/help')}>
            <View style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Visit Help Center</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pro tier — email link
  if (tier === 'pro') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
        </View>
        <View style={styles.gateContainer}>
          <Text style={styles.gateIcon}>📧</Text>
          <Text style={styles.gateTitle}>Email support</Text>
          <Text style={styles.gateBody}>
            Pro plan includes email support. We typically respond within 24 hours.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Truvex Support — ${encodeURIComponent(activeLocation?.name ?? '')}`)}>
            <View style={styles.emailButton}>
              <Text style={styles.emailButtonText}>{SUPPORT_EMAIL}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.upgradeHint}>
            Upgrade to Business for in-app support with faster responses.
          </Text>
        </View>
      </View>
    );
  }

  // Business tier — in-app form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Support</Text>
        <View style={styles.businessBadge}>
          <Text style={styles.businessBadgeText}>Business</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.formTitle}>How can we help?</Text>
        <Text style={styles.formSubtitle}>
          Describe your issue and we'll reply via SMS — usually within a few hours.
        </Text>

        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue…"
          placeholderTextColor="#555"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!message.trim() || loading}
        >
          <View style={[styles.submitButton, (!message.trim() || loading) && styles.submitButtonDisabled]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Send message</Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.responseNote}>Responses are sent via SMS to {session?.user?.phone ?? 'your phone'}.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', flex: 1 },
  businessBadge: {
    backgroundColor: '#10b98122',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  businessBadgeText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  // Gate / email states
  gateContainer: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gateIcon: { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  gateTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  gateBody: { fontSize: 15, color: '#7A8899', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  upgradeButton: {
    backgroundColor: '#F5853F', borderRadius: 12,
    height: 52, paddingHorizontal: 28,
    justifyContent: 'center', marginTop: 8, alignSelf: 'center', minWidth: 200,
  },
  upgradeButtonText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  emailButton: {
    backgroundColor: '#0E7C7B22', borderRadius: 12,
    height: 52, paddingHorizontal: 28,
    justifyContent: 'center', marginTop: 8, alignSelf: 'center', minWidth: 240,
  },
  emailButtonText: { color: '#0E7C7B', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  upgradeHint: { fontSize: 12, color: '#555', textAlign: 'center', marginTop: 12 },

  // Business form
  scroll: { flex: 1 },
  content: { padding: 20 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: '#7A8899', lineHeight: 20, marginBottom: 14 },
  textArea: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 140,
    marginBottom: 14,
  },
  submitButton: {
    backgroundColor: '#F5853F', borderRadius: 12,
    height: 52, justifyContent: 'center', marginBottom: 14,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  responseNote: { fontSize: 12, color: '#555', textAlign: 'center' },
});
