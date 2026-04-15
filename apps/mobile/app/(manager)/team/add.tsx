import { useState, useEffect } from 'react';
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
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../lib/store';
import { Role } from '../../../types/database';

function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function AddWorkerScreen() {
  const router = useRouter();
  const { activeLocation, session } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = name.trim().length > 0 && digits.length === 10 && primaryRoleId !== '';

  useEffect(() => {
    if (!activeLocation) return;
    supabase
      .from('truvex.roles')
      .select('*')
      .eq('location_id', activeLocation.id)
      .then(({ data }) => { if (data) setRoles(data); });
  }, [activeLocation]);

  function toggleAdditionalRole(roleId: string) {
    if (roleId === primaryRoleId) return;
    setAdditionalRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  async function handleAdd() {
    if (!isValid || !activeLocation || !session) return;
    setLoading(true);

    const e164 = `+1${digits}`;

    let workerId: string;

    const { data: existing } = await supabase
      .from('truvex.profiles')
      .select('id')
      .eq('phone', e164)
      .single();

    if (existing) {
      workerId = existing.id;
    } else {
      const { data: newProfile, error } = await supabase
        .from('truvex.profiles')
        .insert({ phone: e164, name: name.trim() })
        .select()
        .single();

      if (!newProfile || error) {
        setLoading(false);
        Alert.alert('Error', error?.message ?? 'Could not create worker');
        return;
      }
      workerId = newProfile.id;
    }

    const { error: memberError } = await supabase.from('truvex.location_members').upsert({
      location_id: activeLocation.id,
      user_id: workerId,
      member_type: 'worker',
      status: 'pending',
      invited_by: session.user.id,
    });

    if (memberError) {
      setLoading(false);
      Alert.alert('Error', memberError.message);
      return;
    }

    // Insert all roles
    const roleRows = [
      { location_id: activeLocation.id, user_id: workerId, role_id: primaryRoleId, is_primary: true },
      ...additionalRoleIds.map((rid) => ({
        location_id: activeLocation.id,
        user_id: workerId,
        role_id: rid,
        is_primary: false,
      })),
    ];

    await supabase.from('truvex.worker_roles').upsert(roleRows);

    setLoading(false);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Worker</Text>
        <TouchableOpacity onPress={handleAdd} disabled={!isValid || loading}>
          {loading ? (
            <ActivityIndicator color="#4f46e5" size="small" />
          ) : (
            <Text style={[styles.save, !isValid && styles.saveDisabled]}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
        <View style={styles.roleGrid}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleChip, primaryRoleId === role.id && styles.primaryChip]}
              onPress={() => {
                setPrimaryRoleId(role.id);
                setAdditionalRoleIds((prev) => prev.filter((id) => id !== role.id));
              }}
            >
              <Text style={[styles.roleChipText, primaryRoleId === role.id && styles.primaryChipText]}>
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Additional Roles (optional)</Text>
        <View style={styles.roleGrid}>
          {roles
            .filter((r) => r.id !== primaryRoleId)
            .map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleChip, additionalRoleIds.includes(role.id) && styles.additionalChip]}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  cancel: { color: '#8888aa', fontSize: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  save: { color: '#4f46e5', fontSize: 16, fontWeight: '700' },
  saveDisabled: { opacity: 0.4 },
  content: { padding: 20, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#aaa', marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  countryCode: { fontSize: 15, color: '#fff', fontWeight: '600' },
  phoneInput: { flex: 1, fontSize: 15, color: '#fff' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryChip: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  additionalChip: { backgroundColor: '#312e81', borderColor: '#4f46e5' },
  roleChipText: { color: '#666', fontSize: 13, fontWeight: '600' },
  primaryChipText: { color: '#fff' },
  additionalChipText: { color: '#a5b4fc' },
});
