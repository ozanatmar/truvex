import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../lib/store';
import { Callout, CalloutResponse, Profile, Role } from '../../../types/database';
import { formatShiftTime, formatShiftDate } from '../../../lib/utils';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://truvex.app';

interface AcceptorRow extends CalloutResponse {
  worker: Profile & { primary_role?: string };
}

export default function CalloutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useStore();

  const [callout, setCallout] = useState<Callout & { role: Role } | null>(null);
  const [acceptors, setAcceptors] = useState<AcceptorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    await Clipboard.setStringAsync(`${WEB_URL}/callout/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fetchCallout = useCallback(async () => {
    if (!id) return;

    const { data: calloutData } = await supabase
      .schema('truvex').from('callouts')
      .select('*, role:roles(*)')
      .eq('id', id)
      .single();

    if (calloutData) setCallout(calloutData as any);

    // Fetch accepted responses with worker profiles
    const { data: responses } = await supabase
      .schema('truvex').from('callout_responses')
      .select('*, worker:profiles(*)')
      .eq('callout_id', id)
      .eq('response', 'accepted')
      .order('responded_at', { ascending: true });

    if (responses) {
      // For each worker, get their primary role name
      const enriched = await Promise.all(
        responses.map(async (r: any) => {
          const { data: wr } = await supabase
            .schema('truvex').from('worker_roles')
            .select('role:roles(name)')
            .eq('user_id', r.worker_id)
            .eq('is_primary', true)
            .single();

          return {
            ...r,
            worker: {
              ...r.worker,
              primary_role: (wr as any)?.role?.name ?? null,
            },
          };
        })
      );
      setAcceptors(enriched);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCallout();

    if (!id) return;

    const channel = supabase
      .channel(`callout-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'truvex', table: 'callout_responses', filter: `callout_id=eq.${id}` },
        () => fetchCallout()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'truvex', table: 'callouts', filter: `id=eq.${id}` },
        () => fetchCallout()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchCallout]);

  async function handleSelectWorker(workerId: string, workerName: string) {
    Alert.alert('Confirm selection', `Assign this shift to ${workerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setSelecting(workerId);

          await supabase
            .schema('truvex').from('callouts')
            .update({
              assigned_worker_id: workerId,
              assigned_at: new Date().toISOString(),
              assigned_by: 'manager',
              status: 'filled',
            })
            .eq('id', id);

          setSelecting(null);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0E7C7B" />
      </View>
    );
  }

  if (!callout) return null;

  const isFilled = callout.status === 'filled' || callout.status === 'cancelled';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Callout Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.roleName}>{callout.role.name}</Text>
          <Text style={styles.dateText}>{formatShiftDate(callout.shift_date)}</Text>
          <Text style={styles.timeText}>
            {formatShiftTime(callout.start_time)} – {formatShiftTime(callout.end_time)}
          </Text>
          {callout.notes ? (
            <Text style={styles.notes}>{callout.notes}</Text>
          ) : null}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status: </Text>
            <Text style={styles.statusValue}>{callout.status.replace('_', ' ')}</Text>
          </View>
          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Text style={styles.copyLinkText}>{copied ? '✓ Link copied' : 'Copy shift link'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {acceptors.length === 0
            ? 'No one has accepted yet'
            : `${acceptors.length} worker${acceptors.length === 1 ? '' : 's'} accepted`}
        </Text>

        {acceptors.map((r) => (
          <View key={r.worker_id} style={styles.workerCard}>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{r.worker.name ?? r.worker.phone}</Text>
              {r.worker.primary_role ? (
                <Text style={styles.workerRole}>{r.worker.primary_role}</Text>
              ) : null}
              <Text style={styles.respondedAt}>
                Accepted {new Date(r.responded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>

            {!isFilled && (
              <TouchableOpacity
                style={[styles.selectButton, selecting === r.worker_id && styles.selectButtonDisabled]}
                onPress={() => handleSelectWorker(r.worker_id, r.worker.name ?? r.worker.phone)}
                disabled={selecting !== null}
              >
                {selecting === r.worker_id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.selectButtonText}>Select</Text>
                )}
              </TouchableOpacity>
            )}

            {callout.assigned_worker_id === r.worker_id && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Selected</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
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
  back: { color: '#7A8899', fontSize: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12 },
  infoCard: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 18, gap: 6 },
  roleName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 14, color: '#aaa' },
  timeText: { fontSize: 16, color: '#ccc', fontWeight: '600' },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 4 },
  statusRow: { flexDirection: 'row', marginTop: 8 },
  statusLabel: { fontSize: 13, color: '#666' },
  statusValue: { fontSize: 13, color: '#aaa', fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#aaa', marginTop: 8 },
  workerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerInfo: { flex: 1, gap: 3 },
  workerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  workerRole: { fontSize: 13, color: '#7A8899' },
  respondedAt: { fontSize: 12, color: '#555', marginTop: 2 },
  selectButton: {
    backgroundColor: '#0E7C7B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectButtonDisabled: { opacity: 0.5 },
  selectButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  assignedBadge: {
    backgroundColor: '#10b98122',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignedText: { color: '#10b981', fontWeight: '700', fontSize: 14 },
  copyLinkButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyLinkText: { fontSize: 13, color: '#7A8899', fontWeight: '600' },
});
