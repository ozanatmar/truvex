import { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Role } from '../../types/database';
import ContactPickerSheet from '../../components/ContactPickerSheet';

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
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = name.trim().length > 0 && digits.length === 10 && selectedRoleId !== '';

  function toggleAdditionalRole(roleId: string) {
    if (roleId === selectedRoleId) return;
    setAdditionalRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  useEffect(() => {
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
  }, [activeLocation]);

  async function handleAddWorker() {
    if (!isValid || !activeLocation || !session) return;
    setLoading(true);

    const e164 = `+1${digits}`;

    // If this phone already has a Truvex account, link the worker directly.
    // Otherwise store as a pending invite keyed on the phone number — the
    // profile is created when the worker signs up and claims the invite.
    const { data: existingProfile } = await supabase
      .schema('truvex').from('profiles')
      .select('id')
      .eq('phone', e164)
      .maybeSingle();

    if (existingProfile) {
      const { error: memberError } = await supabase
        .schema('truvex').from('location_members')
        .upsert({
          location_id: activeLocation.id,
          user_id: existingProfile.id,
          member_type: 'worker',
          status: 'active',
          invited_by: session.user.id,
          invited_name: name.trim(),
          primary_role_id: selectedRoleId,
          additional_role_ids: additionalRoleIds,
        });

      if (memberError) {
        setLoading(false);
        Alert.alert('Error', memberError.message);
        return;
      }

      const roleRows = [
        { location_id: activeLocation.id, user_id: existingProfile.id, role_id: selectedRoleId, is_primary: true },
        ...additionalRoleIds.map((rid) => ({
          location_id: activeLocation.id,
          user_id: existingProfile.id,
          role_id: rid,
          is_primary: false,
        })),
      ];
      await supabase.schema('truvex').from('worker_roles').upsert(roleRows);
    } else {
      const { error: inviteError } = await supabase
        .schema('truvex').from('location_members')
        .upsert({
          location_id: activeLocation.id,
          user_id: null,
          invited_phone: e164,
          invited_name: name.trim(),
          primary_role_id: selectedRoleId,
          additional_role_ids: additionalRoleIds,
          member_type: 'worker',
          status: 'pending',
          invited_by: session.user.id,
        });

      if (inviteError) {
        setLoading(false);
        Alert.alert('Error', inviteError.message);
        return;
      }
    }

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

        <TouchableOpacity style={styles.contactsButton} onPress={() => setShowContacts(true)}>
          <Text style={styles.contactsButtonText}>Import from Contacts</Text>
        </TouchableOpacity>

        <ContactPickerSheet
          visible={showContacts}
          onClose={() => setShowContacts(false)}
          onSelect={({ name: pickedName, digits: pickedDigits }) => {
            setName(pickedName);
            setPhone(formatUSPhone(pickedDigits));
          }}
        />

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
          <ActivityIndicator color="#0E7C7B" />
        ) : (
          <View style={styles.roleGrid}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleChip, selectedRoleId === role.id && styles.roleChipSelected]}
                onPress={() => {
                  setSelectedRoleId(role.id);
                  setAdditionalRoleIds((prev) => prev.filter((id) => id !== role.id));
                }}
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
          </View>
        )}

        {!loadingRoles && roles.length > 1 && selectedRoleId !== '' && (
          <>
            <Text style={styles.label}>Additional Roles (optional)</Text>
            <View style={styles.roleGrid}>
              {roles
                .filter((r) => r.id !== selectedRoleId)
                .map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleChip,
                      additionalRoleIds.includes(role.id) && styles.additionalChip,
                    ]}
                    onPress={() => toggleAdditionalRole(role.id)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        additionalRoleIds.includes(role.id) && styles.additionalChipText,
                      ]}
                    >
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </>
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
    backgroundColor: '#0E7C7B',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A8899',
    marginBottom: 24,
  },
  contactsButton: {
    borderWidth: 1,
    borderColor: '#0E7C7B',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsButtonText: {
    color: '#0E7C7B',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roleChipSelected: {
    backgroundColor: '#0E7C7B',
    borderColor: '#0E7C7B',
  },
  additionalChip: {
    backgroundColor: 'rgba(14,124,123,0.15)',
    borderColor: '#0E7C7B',
  },
  roleChipText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '700',
  },
  roleChipTextSelected: {
    color: '#fff',
  },
  additionalChipText: {
    color: '#7ECACA',
  },
  button: {
    backgroundColor: '#0E7C7B',
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
