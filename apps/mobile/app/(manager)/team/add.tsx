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

const WORKER_LIMITS: Record<string, number | null> = {
  free: 10,
  pro: 30,
  business: null,
};

export default function AddWorkerScreen() {
  const router = useRouter();
  const { activeLocation, session } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerCount, setWorkerCount] = useState(0);

  const digits = phone.replace(/\D/g, '');
  const isValid = name.trim().length > 0 && digits.length === 10 && primaryRoleId !== '';

  const tier = (activeLocation as any)?.subscription_tier ?? 'free';
  const limit = WORKER_LIMITS[tier] ?? 10;
  const atLimit = limit !== null && workerCount >= limit;

  useEffect(() => {
    if (!activeLocation) return;
    supabase
      .schema('truvex').from('roles')
      .select('*')
      .eq('location_id', activeLocation.id)
      .then(({ data }) => { if (data) setRoles(data); });

    supabase
      .schema('truvex').from('location_members')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', activeLocation.id)
      .eq('member_type', 'worker')
      .then(({ count }) => { if (count !== null) setWorkerCount(count); });
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

    // Check if this phone already has a Supabase Auth account (profile exists)
    const { data: existingProfile } = await supabase
      .schema('truvex').from('profiles')
      .select('id')
      .eq('phone', e164)
      .maybeSingle();

    if (existingProfile) {
      // Worker already has an account — link them directly
      const { error: memberError } = await supabase
        .schema('truvex').from('location_members')
        .upsert({
          location_id: activeLocation.id,
          user_id: existingProfile.id,
          member_type: 'worker',
          status: 'active',
          invited_by: session.user.id,
          invited_name: name.trim(),
          primary_role_id: primaryRoleId,
        });

      if (memberError) {
        setLoading(false);
        Alert.alert('Error', memberError.message);
        return;
      }

      const roleRows = [
        { location_id: activeLocation.id, user_id: existingProfile.id, role_id: primaryRoleId, is_primary: true },
        ...additionalRoleIds.map((rid) => ({
          location_id: activeLocation.id,
          user_id: existingProfile.id,
          role_id: rid,
          is_primary: false,
        })),
      ];
      await supabase.schema('truvex').from('worker_roles').upsert(roleRows);
    } else {
      // Worker hasn't signed up yet — store as pending invite by phone
      const { error: inviteError } = await supabase
        .schema('truvex').from('location_members')
        .upsert({
          location_id: activeLocation.id,
          user_id: null,
          invited_phone: e164,
          invited_name: name.trim(),
          primary_role_id: primaryRoleId,
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
    router.back();
  }

  if (atLimit) {
    const tierLabel = tier === 'pro' ? 'Pro' : 'Free';
    const nextTier = tier === 'free' ? 'Pro ($49/mo)' : 'Business ($99/mo)';
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Worker</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.limitContainer}>
          <Text style={styles.limitIcon}>🔒</Text>
          <Text style={styles.limitTitle}>Worker limit reached</Text>
          <Text style={styles.limitBody}>
            Your {tierLabel} plan supports up to {limit} workers. Upgrade to {nextTier} to add more.
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => router.push('/(manager)/settings')}>
            <Text style={styles.upgradeButtonText}>View upgrade options</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.title}>Add Worker</Text>
        <TouchableOpacity onPress={handleAdd} disabled={!isValid || loading}>
          {loading ? (
            <ActivityIndicator color="#F5853F" size="small" />
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
  cancel: { color: '#7A8899', fontSize: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  save: { color: '#F5853F', fontSize: 16, fontWeight: '700' },
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
  primaryChip: { backgroundColor: '#0E7C7B', borderColor: '#0E7C7B' },
  additionalChip: { backgroundColor: 'rgba(14,124,123,0.15)', borderColor: '#0E7C7B' },
  roleChipText: { color: '#666', fontSize: 13, fontWeight: '600' },
  primaryChipText: { color: '#fff' },
  additionalChipText: { color: '#7ECACA' },
  limitContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  limitIcon: { fontSize: 48 },
  limitTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  limitBody: { fontSize: 15, color: '#7A8899', textAlign: 'center', lineHeight: 22 },
  upgradeButton: {
    backgroundColor: '#F5853F',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  upgradeButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
