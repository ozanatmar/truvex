import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Role } from '../types/database';
import { formatPhoneDisplay } from '../lib/utils';

interface Props {
  visible: boolean;
  // Either a profile id (claimed worker) or a location_members.id (pending invite).
  workerId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditWorkerSheet({ visible, workerId, onClose, onSaved }: Props) {
  const { activeLocation } = useStore();
  const insets = useSafeAreaInsets();

  const [memberRowId, setMemberRowId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [primaryRoleId, setPrimaryRoleId] = useState('');
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !workerId || !activeLocation) return;
    setLoading(true);

    (async () => {
      const { data: member } = await supabase
        .schema('truvex').from('location_members')
        .select('*')
        .eq('location_id', activeLocation.id)
        .or(`user_id.eq.${workerId},id.eq.${workerId}`)
        .maybeSingle();

      const { data: rolesData } = await supabase
        .schema('truvex').from('roles')
        .select('*')
        .eq('location_id', activeLocation.id);
      if (rolesData) setRoles(rolesData);

      if (!member) {
        setLoading(false);
        return;
      }

      setMemberRowId((member as any).id);
      const mUserId = (member as any).user_id as string | null;
      setUserId(mUserId);

      if (mUserId) {
        const [{ data: profile }, { data: wr }] = await Promise.all([
          supabase.schema('truvex').from('profiles').select('*').eq('id', mUserId).maybeSingle(),
          supabase.schema('truvex').from('worker_roles').select('*').eq('user_id', mUserId).eq('location_id', activeLocation.id),
        ]);
        setName((member as any).invited_name ?? (profile as any)?.name ?? '');
        setPhone((profile as any)?.phone ?? '');
        const primary = (wr ?? []).find((r: any) => r.is_primary);
        setPrimaryRoleId(primary ? primary.role_id : '');
        setAdditionalRoleIds((wr ?? []).filter((r: any) => !r.is_primary).map((r: any) => r.role_id));
      } else {
        setName((member as any).invited_name ?? '');
        setPhone((member as any).invited_phone ?? '');
        setPrimaryRoleId((member as any).primary_role_id ?? '');
        setAdditionalRoleIds((member as any).additional_role_ids ?? []);
      }

      setLoading(false);
    })();
  }, [visible, workerId, activeLocation]);

  async function handleSave() {
    if (!memberRowId || !activeLocation) return;
    setSaving(true);

    if (userId) {
      await supabase.schema('truvex').from('profiles').update({ name: name.trim() }).eq('id', userId);
      await supabase.schema('truvex').from('location_members')
        .update({
          invited_name: name.trim(),
          primary_role_id: primaryRoleId || null,
          additional_role_ids: additionalRoleIds,
        })
        .eq('id', memberRowId);

      await supabase
        .schema('truvex').from('worker_roles')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', activeLocation.id);

      const newRoles = [
        ...(primaryRoleId
          ? [{ location_id: activeLocation.id, user_id: userId, role_id: primaryRoleId, is_primary: true }]
          : []),
        ...additionalRoleIds.map((rid) => ({
          location_id: activeLocation.id,
          user_id: userId,
          role_id: rid,
          is_primary: false,
        })),
      ];
      if (newRoles.length > 0) {
        await supabase.schema('truvex').from('worker_roles').insert(newRoles);
      }
    } else {
      await supabase.schema('truvex').from('location_members')
        .update({
          invited_name: name.trim(),
          primary_role_id: primaryRoleId || null,
          additional_role_ids: additionalRoleIds,
        })
        .eq('id', memberRowId);
    }

    setSaving(false);
    onSaved?.();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0E7C7B" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Worker</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#0E7C7B" size="small" />
              ) : (
                <Text style={styles.save}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Worker's name"
              placeholderTextColor="#555"
            />

            <Text style={styles.label}>Phone</Text>
            <Text style={styles.phoneReadOnly}>{phone ? formatPhoneDisplay(phone) : '—'}</Text>

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
      )}
    </Modal>
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
    // paddingTop applied inline from safe-area inset + 16 so the header
    // sits below the status bar / notch.
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  cancel: { color: '#7A8899', fontSize: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  save: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
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
    color: '#aaa',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  primaryChip: { backgroundColor: '#0E7C7B', borderColor: '#0E7C7B' },
  additionalChip: { backgroundColor: 'rgba(14,124,123,0.15)', borderColor: '#0E7C7B' },
  roleChipText: { color: '#666', fontSize: 13, fontWeight: '600' },
  primaryChipText: { color: '#fff' },
  additionalChipText: { color: '#7ECACA' },
});
