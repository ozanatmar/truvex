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
import ShiftCoveredSheet from '../../../components/ShiftCoveredSheet';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://truvex.app';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

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
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [, setTick] = useState(0);
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle: string } | null>(null);

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
      // Pull manager-set invited_name for each acceptor in one query.
      // Prefer it over profile.name, matching the team/history screens.
      const workerIds = responses.map((r: any) => r.worker_id);
      const { data: members } = workerIds.length > 0
        ? await supabase
            .schema('truvex').from('location_members')
            .select('user_id, invited_name')
            .eq('location_id', (calloutData as any).location_id)
            .in('user_id', workerIds)
        : { data: [] };
      const invitedNameByUserId = new Map<string, string | null>(
        (members ?? []).map((m: any) => [m.user_id, m.invited_name])
      );

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
              name: invitedNameByUserId.get(r.worker_id) ?? r.worker?.name ?? null,
              primary_role: (wr as any)?.role?.name ?? null,
            },
          };
        })
      );
      setAcceptors(enriched);
    }

    setLastRefreshedAt(new Date());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCallout();

    if (!id) return;

    const channel = supabase
      .channel(`callout:${id}:${Date.now()}`)
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

  // Polling fallback: re-fetch every 15s while the callout is still actionable.
  // Realtime pushes instant updates, but polling guarantees the indicator stays
  // fresh and covers cases where the websocket drops silently.
  const isActive = callout?.status === 'open' || callout?.status === 'pending_selection';
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => { fetchCallout(); }, 15000);
    return () => clearInterval(interval);
  }, [isActive, fetchCallout]);

  // 1s tick so the "Updated Xs ago" label counts up live between refreshes.
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  async function handleSelectWorker(workerId: string, workerName: string) {
    Alert.alert('Confirm selection', `Assign this shift to ${workerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setSelecting(workerId);

          const snapshot = callout;

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

          if (snapshot) {
            const start = formatShiftTime(snapshot.start_time);
            const end = formatShiftTime(snapshot.end_time);
            const date = formatShiftDate(snapshot.shift_date);
            setCelebrate({
              title: 'Shift Covered',
              subtitle: `${workerName} will cover ${snapshot.role.name} on ${date} from ${start} to ${end}.`,
            });
          } else {
            router.back();
          }
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
            <Text style={styles.statusValue}>{capitalize(callout.status.replace('_', ' '))}</Text>
          </View>
          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Text style={styles.copyLinkText}>{copied ? '✓ Link copied' : 'Copy shift link'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {acceptors.length === 0
              ? 'No one has accepted yet'
              : `${acceptors.length} worker${acceptors.length === 1 ? '' : 's'} accepted`}
          </Text>
          {isActive && (
            <Text style={styles.refreshedAt}>Updated {formatAgo(lastRefreshedAt)}</Text>
          )}
        </View>

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

      {celebrate && (
        <ShiftCoveredSheet
          visible
          title={celebrate.title}
          subtitle={celebrate.subtitle}
          onClose={() => {
            setCelebrate(null);
            router.back();
          }}
        />
      )}
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
  back: { color: '#7A8899', fontSize: 16, minWidth: 60 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', minWidth: 130, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12 },
  infoCard: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 18, gap: 6 },
  roleName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 14, color: '#aaa' },
  timeText: { fontSize: 16, color: '#ccc', fontWeight: '600' },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 4 },
  statusRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  statusLabel: { fontSize: 13, color: '#666', flexShrink: 0 },
  statusValue: { fontSize: 13, color: '#aaa', fontWeight: '600', flexShrink: 0, minWidth: 130 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#aaa', flexShrink: 1 },
  refreshedAt: { fontSize: 12, color: '#555', minWidth: 130, textAlign: 'right', flexShrink: 0 },
  workerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  workerInfo: { flex: 1, gap: 3 },
  workerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  workerRole: { fontSize: 13, color: '#7A8899' },
  respondedAt: { fontSize: 12, color: '#555', marginTop: 2, minWidth: 140 },
  selectButton: {
    backgroundColor: '#0E7C7B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
  },
  selectButtonDisabled: { opacity: 0.5 },
  selectButtonText: { color: '#fff', fontWeight: '700', fontSize: 14, minWidth: 54, textAlign: 'center' },
  assignedBadge: {
    backgroundColor: '#10b98122',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  assignedText: { color: '#10b981', fontWeight: '700', fontSize: 14, minWidth: 64, textAlign: 'center' },
  copyLinkButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyLinkText: { fontSize: 13, color: '#7A8899', fontWeight: '600', minWidth: 120, textAlign: 'center' },
});
