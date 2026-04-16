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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Role } from '../../types/database';

interface ShiftPreset {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
}

function timeStringToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeDisplay(t: string): string {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function parseDateStr(s: string): Date {
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function formatDateDisplay(s: string): string {
  if (!s) return 'Select date';
  return parseDateStr(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  const [presets, setPresets] = useState<ShiftPreset[]>([]);
  const [loading, setLoading] = useState(false);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Save preset modal
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');

  const isValid = shiftDate !== '' && startTime !== '' && endTime !== '' && roleId !== '';

  useEffect(() => {
    if (!activeLocation) return;
    supabase.schema('truvex').from('roles').select('*').eq('location_id', activeLocation.id)
      .then(({ data }) => { if (data) setRoles(data); });
    supabase.schema('truvex').from('shift_presets').select('*').eq('location_id', activeLocation.id).order('created_at')
      .then(({ data }) => { if (data) setPresets(data); });
  }, [activeLocation]);

  function applyPreset(p: ShiftPreset) {
    setStartTime(p.start_time.slice(0, 5));
    setEndTime(p.end_time.slice(0, 5));
  }

  async function handleDeletePreset(id: string) {
    await supabase.schema('truvex').from('shift_presets').delete().eq('id', id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSavePreset() {
    if (!presetLabel.trim() || !startTime || !endTime || !activeLocation) return;
    const { data } = await supabase.schema('truvex').from('shift_presets').insert({
      location_id: activeLocation.id,
      label: presetLabel.trim(),
      start_time: startTime,
      end_time: endTime,
    }).select().single();
    if (data) setPresets((prev) => [...prev, data]);
    setPresetLabel('');
    setShowSavePreset(false);
  }

  async function handlePost() {
    if (!isValid || !activeLocation || !session) return;
    setLoading(true);

    const { error } = await supabase.schema('truvex').from('callouts').insert({
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
    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  // iOS uses inline pickers in modals; Android uses native dialog
  const pickerDisplay = Platform.OS === 'ios' ? 'spinner' : 'default';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Post Callout</Text>
        <TouchableOpacity onPress={handlePost} disabled={!isValid || loading}>
          {loading ? <ActivityIndicator color="#0E7C7B" /> : (
            <Text style={[styles.post, !isValid && styles.postDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Date — full width */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.pickerButtonText}>{formatDateDisplay(shiftDate)}</Text>
        </TouchableOpacity>

        {/* Times — half width side by side */}
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.label}>Start time</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.pickerButtonText}>{formatTimeDisplay(startTime)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeField}>
            <Text style={styles.label}>End time</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.pickerButtonText}>{formatTimeDisplay(endTime)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Presets */}
        {presets.length > 0 && (
          <>
            <Text style={styles.label}>Saved shifts</Text>
            <View style={styles.presetRow}>
              {presets.map((p) => (
                <View key={p.id} style={styles.presetChipWrap}>
                  <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset(p)}>
                    <Text style={styles.presetLabel}>{p.label}</Text>
                    <Text style={styles.presetTime}>
                      {formatTimeDisplay(p.start_time)} – {formatTimeDisplay(p.end_time)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetDelete} onPress={() => handleDeletePreset(p.id)}>
                    <Text style={styles.presetDeleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {startTime && endTime && (
          <TouchableOpacity onPress={() => { setPresetLabel(''); setShowSavePreset(true); }}>
            <Text style={styles.savePresetLink}>+ Save as preset</Text>
          </TouchableOpacity>
        )}

        {/* Role */}
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

      {/* Date picker */}
      {showDatePicker && (
        <PickerModal title="Select date" onDone={() => setShowDatePicker(false)}>
          <DateTimePicker
            value={parseDateStr(shiftDate)}
            mode="date"
            display={pickerDisplay}
            minimumDate={new Date()}
            onChange={(_, d) => { if (d) setShiftDate(d.toISOString().split('T')[0]); if (Platform.OS === 'android') setShowDatePicker(false); }}
            style={styles.picker}
          />
        </PickerModal>
      )}

      {/* Start time picker */}
      {showStartPicker && (
        <PickerModal title="Start time" onDone={() => setShowStartPicker(false)}>
          <DateTimePicker
            value={startTime ? timeStringToDate(startTime) : new Date()}
            mode="time"
            display={pickerDisplay}
            is24Hour={false}
            onChange={(_, d) => { if (d) setStartTime(dateToTimeString(d)); if (Platform.OS === 'android') setShowStartPicker(false); }}
            style={styles.picker}
          />
        </PickerModal>
      )}

      {/* End time picker */}
      {showEndPicker && (
        <PickerModal title="End time" onDone={() => setShowEndPicker(false)}>
          <DateTimePicker
            value={endTime ? timeStringToDate(endTime) : new Date()}
            mode="time"
            display={pickerDisplay}
            is24Hour={false}
            onChange={(_, d) => { if (d) setEndTime(dateToTimeString(d)); if (Platform.OS === 'android') setShowEndPicker(false); }}
            style={styles.picker}
          />
        </PickerModal>
      )}

      {/* Save preset modal */}
      <Modal visible={showSavePreset} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Name this preset</Text>
            <Text style={styles.modalSub}>{formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)}</Text>
            <TextInput
              style={styles.modalInput}
              value={presetLabel}
              onChangeText={setPresetLabel}
              placeholder='e.g. "Morning shift"'
              placeholderTextColor="#555"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowSavePreset(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePreset} disabled={!presetLabel.trim()}>
                <Text style={[styles.modalSave, !presetLabel.trim() && { opacity: 0.4 }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function PickerModal({ title, onDone, children }: { title: string; onDone: () => void; children: React.ReactNode }) {
  if (Platform.OS === 'android') return <>{children}</>;
  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onDone}>
              <Text style={styles.pickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#1a1a2e',
  },
  cancel: { color: '#7A8899', fontSize: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  post: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
  postDisabled: { opacity: 0.4 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#aaa', marginTop: 8, marginBottom: 4 },
  pickerButton: {
    backgroundColor: '#1a1a2e', borderRadius: 10, height: 48,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  pickerButtonText: { color: '#fff', fontSize: 15 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChipWrap: { flexDirection: 'row', alignItems: 'center' },
  presetChip: {
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#0E7C7B',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderRightWidth: 0,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  presetLabel: { color: '#7ECACA', fontSize: 12, fontWeight: '700' },
  presetTime: { color: '#fff', fontSize: 11, marginTop: 2 },
  presetDelete: {
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#0E7C7B', borderLeftWidth: 0,
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center',
  },
  presetDeleteText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  savePresetLink: { color: '#0E7C7B', fontSize: 13, fontWeight: '600', marginTop: 4 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  roleChipSelected: { backgroundColor: '#0E7C7B', borderColor: '#0E7C7B' },
  roleChipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  roleChipTextSelected: { color: '#fff' },
  input: { backgroundColor: '#1a1a2e', borderRadius: 10, height: 48, paddingHorizontal: 14, color: '#fff', fontSize: 15 },
  notesInput: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  // Picker modal (iOS)
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  pickerSheet: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pickerDone: { fontSize: 16, fontWeight: '700', color: '#0E7C7B' },
  picker: { backgroundColor: '#1a1a2e' },
  // Save preset modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088', padding: 32 },
  modalCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  modalSub: { fontSize: 13, color: '#666' },
  modalInput: { backgroundColor: '#0f0f1a', borderRadius: 10, height: 48, paddingHorizontal: 14, color: '#fff', fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
  modalCancel: { color: '#7A8899', fontSize: 15, fontWeight: '600' },
  modalSave: { color: '#0E7C7B', fontSize: 15, fontWeight: '700' },
});
