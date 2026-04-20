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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ManageRolesSheet({ visible, onClose, onSaved }: Props) {
  const { activeLocation } = useStore();
  const [roles, setRoles] = useState<string[]>([]);
  const [originalRoles, setOriginalRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !activeLocation) return;
    setLoading(true);
    setNewRole('');
    supabase
      .schema('truvex').from('roles')
      .select('name')
      .eq('location_id', activeLocation.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const names = (data ?? []).map((r: any) => r.name as string);
        setRoles(names);
        setOriginalRoles(names);
        setLoading(false);
      });
  }, [visible, activeLocation]);

  function removeRole(role: string) {
    setRoles((prev) => prev.filter((r) => r !== role));
  }

  function addRole() {
    const trimmed = newRole.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles((prev) => [...prev, trimmed]);
    setNewRole('');
  }

  async function handleSave() {
    if (!activeLocation || roles.length === 0) return;
    setSaving(true);

    const toAdd = roles.filter((r) => !originalRoles.includes(r));
    const toRemove = originalRoles.filter((r) => !roles.includes(r));

    if (toRemove.length > 0) {
      const { error: delError } = await supabase
        .schema('truvex').from('roles')
        .delete()
        .eq('location_id', activeLocation.id)
        .in('name', toRemove);
      if (delError) {
        setSaving(false);
        Alert.alert('Error', delError.message);
        return;
      }
    }

    if (toAdd.length > 0) {
      const { error: insError } = await supabase
        .schema('truvex').from('roles')
        .insert(toAdd.map((name) => ({ location_id: activeLocation.id, name })));
      if (insError) {
        setSaving(false);
        Alert.alert('Error', insError.message);
        return;
      }
    }

    setOriginalRoles(roles);
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Roles</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || roles.length === 0}>
            {saving ? (
              <ActivityIndicator color="#0E7C7B" size="small" />
            ) : (
              <Text style={[styles.save, roles.length === 0 && styles.saveDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.intro}>
          <Text style={styles.subtitle}>
            These are the roles at your restaurant. Edit as needed.
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <ActivityIndicator color="#0E7C7B" style={{ marginTop: 16 }} />
          )}
          {!loading && roles.map((role) => (
            <View key={role} style={styles.roleRow}>
              <Text style={styles.roleName}>{role}</Text>
              <TouchableOpacity onPress={() => removeRole(role)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!loading && (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newRole}
                onChangeText={setNewRole}
                placeholder="Add a role..."
                placeholderTextColor="#555"
                returnKeyType="done"
                onSubmitEditing={addRole}
              />
              <TouchableOpacity
                style={[styles.addButton, !newRole.trim() && styles.addButtonDisabled]}
                onPress={addRole}
                disabled={!newRole.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
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
  save: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
  saveDisabled: { opacity: 0.4 },
  intro: {
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A8899',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 40,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a40',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  removeText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#2a2a40',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    color: '#fff',
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#0E7C7B',
    borderRadius: 10,
    paddingHorizontal: 20,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
