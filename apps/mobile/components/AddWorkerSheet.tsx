import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
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
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Role } from '../types/database';
import { workerLimit, effectiveTier } from '../lib/subscription';
import ContactPickerSheet from './ContactPickerSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
  onOpenUpgrade?: () => void;
}

function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

const FADE_MS = 150;

export default function AddWorkerSheet({ visible, onClose, onAdded, onOpenUpgrade }: Props) {
  const { activeLocation, session } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerCount, setWorkerCount] = useState(0);
  const [showContacts, setShowContacts] = useState(false);

  // Drive fade manually so we can halve the default Modal duration (~300ms).
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
  }, [visible]);

  const digits = phone.replace(/\D/g, '');
  const isValid = name.trim().length > 0 && digits.length === 10 && primaryRoleId !== '';

  const tier = effectiveTier(activeLocation);
  const limit = workerLimit(activeLocation);
  const atLimit = limit !== null && workerCount >= limit;

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPhone('');
    setPrimaryRoleId('');
    setAdditionalRoleIds([]);
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
  }, [visible, activeLocation]);

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
    onAdded?.();
    onClose();
  }

  return (
    <Modal
      visible={mounted}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.fadeWrapper, { opacity }]}>
      {atLimit ? (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Worker</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.limitContainer}>
            <Text style={styles.limitIcon}>🔒</Text>
            <Text style={styles.limitTitle}>Worker limit reached</Text>
            <Text style={styles.limitBody}>
              Your {tier === 'pro' ? 'Pro' : 'Free'} plan supports up to {limit} workers. Upgrade to{' '}
              {tier === 'free' ? 'Pro ($49/mo)' : 'Business ($99/mo)'} to add more.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                onClose();
                onOpenUpgrade?.();
              }}
            >
              <Text style={styles.upgradeButtonText}>View upgrade options</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
      )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fadeWrapper: { flex: 1, backgroundColor: '#0f0f1a' },
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
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
  contactsButton: {
    borderWidth: 1,
    borderColor: '#0E7C7B',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  contactsButtonText: { color: '#0E7C7B', fontWeight: '700', fontSize: 14 },
});
