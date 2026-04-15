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
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Role } from '../../types/database';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PostCalloutScreen() {
  const router = useRouter();
  const { activeLocation, session } = useStore();

  const [shiftDate, setShiftDate] = useState(todayDate());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roleId, setRoleId] = useState('');
  const [notes, setNotes] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const isValid =
    shiftDate !== '' && startTime !== '' && endTime !== '' && roleId !== '';

  useEffect(() => {
    if (!activeLocation) return;
    supabase
      .from('truvex.roles')
      .select('*')
      .eq('location_id', activeLocation.id)
      .then(({ data }) => { if (data) setRoles(data); });
  }, [activeLocation]);

  async function handlePost() {
    if (!isValid || !activeLocation || !session) return;
    setLoading(true);

    const { error } = await supabase.from('truvex.callouts').insert({
      location_id: activeLocation.id,
      manager_id: session.user.id,
      role_id: roleId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      notes: notes.trim() || null,
      status: 'open',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

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
        <Text style={styles.title}>Post Callout</Text>
        <TouchableOpacity onPress={handlePost} disabled={!isValid || loading}>
          {loading ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <Text style={[styles.post, !isValid && styles.postDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={shiftDate}
          onChangeText={setShiftDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Start time</Text>
        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          placeholder="e.g. 09:00"
          placeholderTextColor="#555"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>End time</Text>
        <TextInput
          style={styles.input}
          value={endTime}
          onChangeText={setEndTime}
          placeholder="e.g. 17:00"
          placeholderTextColor="#555"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleGrid}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleChip, roleId === role.id && styles.roleChipSelected]}
              onPress={() => setRoleId(role.id)}
            >
              <Text style={[styles.roleChipText, roleId === role.id && styles.roleChipTextSelected]}>
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any details for the worker..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={3}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  cancel: {
    color: '#8888aa',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  post: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '700',
  },
  postDisabled: {
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
  },
  notesInput: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  roleChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: '#fff',
  },
});
