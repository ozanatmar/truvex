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
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => Linking.openURL('https://truvex.app/help')}
          >
            <Text style={styles.upgradeButtonText}>Visit Help Center</Text>
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
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Truvex Support — ${encodeURIComponent(activeLocation?.name ?? '')}`)}
          >
            <Text style={styles.emailButtonText}>{SUPPORT_EMAIL}</Text>
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
          style={[styles.submitButton, (!message.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!message.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Send message</Text>
          )}
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
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  businessBadge: {
    backgroundColor: '#10b98122',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  businessBadgeText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  // Gate / email states
  gateContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  gateIcon: { fontSize: 52 },
  gateTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  gateBody: { fontSize: 15, color: '#7A8899', textAlign: 'center', lineHeight: 22 },
  upgradeButton: {
    backgroundColor: '#F5853F', borderRadius: 12,
    height: 52, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  upgradeButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emailButton: {
    borderWidth: 1, borderColor: '#0E7C7B', borderRadius: 12,
    height: 52, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  emailButtonText: { color: '#0E7C7B', fontWeight: '700', fontSize: 15 },
  upgradeHint: { fontSize: 12, color: '#555', textAlign: 'center' },

  // Business form
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  formSubtitle: { fontSize: 14, color: '#7A8899', lineHeight: 20 },
  textArea: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  submitButton: {
    backgroundColor: '#F5853F', borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  responseNote: { fontSize: 12, color: '#555', textAlign: 'center' },
});
