import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Role } from '../../types/database';

function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function FirstWorkerScreen() {
  const router = useRouter();
  const { activeLocation, session } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = name.trim().length > 0 && digits.length === 10 && selectedRoleId !== '';

  useState(() => {
    if (!activeLocation) return;
    setLoadingRoles(true);
    supabase
      .schema('truvex').from('roles')
      .select('*')
      .eq('location_id', activeLocation.id)
      .then(({ data }) => {
        if (data) setRoles(data);
        setLoadingRoles(false);
      });
  });

  async function pickFromContacts() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow contacts access in Settings to use this feature.');
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    // Show a simple list — in production this would be a searchable modal
    // For now, just pick the first contact with a US phone for demo
    Alert.alert('Contacts', 'Contact picker — implement a search modal in production');
  }

  async function handleAddWorker() {
    if (!isValid || !activeLocation || !session) return;
    setLoading(true);

    const e164 = `+1${digits}`;

    // Check if profile exists for this phone
    let workerId: string;

    const { data: existing } = await supabase
      .schema('truvex').from('profiles')
      .select('id')
      .eq('phone', e164)
      .single();

    if (existing) {
      workerId = existing.id;
    } else {
      // Create a placeholder profile — worker will claim it on first login
      const { data: newProfile, error } = await supabase
        .schema('truvex').from('profiles')
        .insert({ phone: e164, name: name.trim() })
        .select()
        .single();

      if (!newProfile || error) {
        setLoading(false);
        Alert.alert('Error', error?.message ?? 'Could not add worker');
        return;
      }
      workerId = newProfile.id;
    }

    // Add to location_members
    await supabase.schema('truvex').from('location_members').upsert({
      location_id: activeLocation.id,
      user_id: workerId,
      member_type: 'worker',
      status: 'pending',
      invited_by: session.user.id,
    });

    // Assign primary role
    await supabase.schema('truvex').from('worker_roles').upsert({
      location_id: activeLocation.id,
      user_id: workerId,
      role_id: selectedRoleId,
      is_primary: true,
    });

    setLoading(false);
    router.replace('/(manager)/');
  }

  async function handleSkip() {
    router.replace('/(manager)/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.title}>Add your first worker</Text>
        <Text style={styles.subtitle}>You can add more from the Team screen later.</Text>

        <TouchableOpacity style={styles.contactsButton} onPress={pickFromContacts}>
          <Text style={styles.contactsButtonText}>Import from Contacts</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>— or enter manually —</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Worker's name"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Phone</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.countryCode}>+1</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={(v) => setPhone(formatUSPhone(v))}
            placeholder="(555) 555-5555"
            placeholderTextColor="#555"
            keyboardType="phone-pad"
            maxLength={14}
          />
        </View>

        <Text style={styles.label}>Primary Role</Text>
        {loadingRoles ? (
          <ActivityIndicator color="#4f46e5" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleChip, selectedRoleId === role.id && styles.roleChipSelected]}
                onPress={() => setSelectedRoleId(role.id)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    selectedRoleId === role.id && styles.roleChipTextSelected,
                  ]}
                >
                  {role.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleAddWorker}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add worker & finish</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inner: {
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 12,
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
    backgroundColor: '#4f46e5',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888aa',
    marginBottom: 24,
  },
  contactsButton: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsButtonText: {
    color: '#4f46e5',
    fontWeight: '700',
    fontSize: 15,
  },
  orText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  countryCode: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  roleScroll: {
    marginBottom: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  roleChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  roleChipText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
});
