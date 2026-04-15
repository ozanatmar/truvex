import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

const DEFAULT_ROLES = ['Cook', 'Server', 'Bartender', 'Host', 'Cashier', 'Dishwasher', 'Manager'];

export default function RolesScreen() {
  const router = useRouter();
  const { activeLocation } = useStore();
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);

  function removeRole(role: string) {
    setRoles((prev) => prev.filter((r) => r !== role));
  }

  function addRole() {
    const trimmed = newRole.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles((prev) => [...prev, trimmed]);
    setNewRole('');
  }

  async function handleContinue() {
    if (!activeLocation || roles.length === 0) return;
    setLoading(true);

    const { error } = await supabase.schema('truvex').from('roles').insert(
      roles.map((name) => ({ location_id: activeLocation.id, name }))
    );

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push('/onboarding/first-worker');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.title}>Set up roles</Text>
        <Text style={styles.subtitle}>
          These are the roles at your restaurant. Edit as needed.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {roles.map((role) => (
          <View key={role} style={styles.roleRow}>
            <Text style={styles.roleName}>{role}</Text>
            <TouchableOpacity onPress={() => removeRole(role)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, roles.length === 0 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={roles.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 24,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888aa',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 24,
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
    fontWeight: '600',
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
    backgroundColor: '#4f46e5',
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
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 16,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
