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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../lib/store';
import { Profile, Role, WorkerRole } from '../../../types/database';

export default function EditWorkerScreen() {
  const { id: workerId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeLocation } = useStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [workerRoles, setWorkerRoles] = useState<WorkerRole[]>([]);
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workerId || !activeLocation) return;

    Promise.all([
      supabase.schema('truvex').from('profiles').select('*').eq('id', workerId).single(),
      supabase.schema('truvex').from('roles').select('*').eq('location_id', activeLocation.id),
      supabase.schema('truvex').from('worker_roles').select('*').eq('user_id', workerId).eq('location_id', activeLocation.id),
    ]).then(([profileRes, rolesRes, wrRes]) => {
      if (profileRes.data) {
        setProfile(profileRes.data);
        setName(profileRes.data.name ?? '');
      }
      if (rolesRes.data) setRoles(rolesRes.data);
      if (wrRes.data) {
        setWorkerRoles(wrRes.data);
        const primary = wrRes.data.find((wr: WorkerRole) => wr.is_primary);
        if (primary) setPrimaryRoleId(primary.role_id);
        setAdditionalRoleIds(
          wrRes.data.filter((wr: WorkerRole) => !wr.is_primary).map((wr: WorkerRole) => wr.role_id)
        );
      }
      setLoading(false);
    });
  }, [workerId, activeLocation]);

  async function handleSave() {
    if (!workerId || !activeLocation) return;
    setSaving(true);

    // Update profile name (if worker has an account)
    await supabase.schema('truvex').from('profiles').update({ name: name.trim() }).eq('id', workerId);
    // Also update invited_name on the membership row (covers pending invites + syncs display name)
    await supabase.schema('truvex').from('location_members')
      .update({ invited_name: name.trim() })
      .eq('location_id', activeLocation.id)
      .eq('user_id', workerId);

    // Replace worker_roles
    await supabase
      .schema('truvex').from('worker_roles')
      .delete()
      .eq('user_id', workerId)
      .eq('location_id', activeLocation.id);

    const newRoles = [
      { location_id: activeLocation.id, user_id: workerId, role_id: primaryRoleId, is_primary: true },
      ...additionalRoleIds.map((rid) => ({
        location_id: activeLocation.id,
        user_id: workerId,
        role_id: rid,
        is_primary: false,
      })),
    ];

    await supabase.schema('truvex').from('worker_roles').insert(newRoles);

    setSaving(false);
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
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
        <Text style={styles.title}>Edit Worker</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#4f46e5" size="small" />
          ) : (
            <Text style={styles.save}>Save</Text>
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
        <Text style={styles.phoneReadOnly}>{profile?.phone}</Text>

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

        <Text style={styles.label}>Additional Roles</Text>
        <View style={styles.roleGrid}>
          {roles
            .filter((r) => r.id !== primaryRoleId)
            .map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleChip, additionalRoleIds.includes(role.id) && styles.additionalChip]}
                onPress={() =>
                  setAdditionalRoleIds((prev) =>
                    prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                  )
                }
              >
                <Text style={[styles.roleChipText, additionalRoleIds.includes(role.id) && styles.additionalChipText]}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a' },
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
  phoneReadOnly: {
    fontSize: 15,
    color: '#555',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  primaryChip: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  additionalChip: { backgroundColor: '#312e81', borderColor: '#4f46e5' },
  roleChipText: { color: '#666', fontSize: 13, fontWeight: '600' },
  primaryChipText: { color: '#fff' },
  additionalChipText: { color: '#a5b4fc' },
});
