import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { formatShiftTime, formatShiftDate, formatPhoneDisplay } from '../lib/utils';

interface Props {
  visible: boolean;
  calloutId: string | null;
  onClose: () => void;
}

interface Detail {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  created_at: string;
  assigned_at: string | null;
  assigned_by: string | null;
  role_name: string;
  worker_name: string | null;
  worker_phone: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#0E7C7B',
  pending_selection: '#f59e0b',
  filled: '#10b981',
  cancelled: '#6b7280',
  expired: '#6b7280',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CalloutDetailSheet({ visible, calloutId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !calloutId) return;
    setLoading(true);
    setDetail(null);

    (async () => {
      const { data: callout } = await supabase
        .schema('truvex').from('callouts')
        .select('*, role:roles(name)')
        .eq('id', calloutId)
        .maybeSingle();

      if (!callout) {
        setLoading(false);
        return;
      }

      let workerName: string | null = null;
      let workerPhone: string | null = null;
      const assignedId = (callout as any).assigned_worker_id as string | null;
      if (assignedId) {
        const [{ data: profile }, { data: member }] = await Promise.all([
          supabase.schema('truvex').from('profiles').select('name, phone').eq('id', assignedId).maybeSingle(),
          supabase.schema('truvex').from('location_members')
            .select('invited_name')
            .eq('location_id', (callout as any).location_id)
            .eq('user_id', assignedId)
            .maybeSingle(),
        ]);
        workerName = (member as any)?.invited_name ?? (profile as any)?.name ?? null;
        workerPhone = (profile as any)?.phone ?? null;
      }

      setDetail({
        id: (callout as any).id,
        shift_date: (callout as any).shift_date,
        start_time: (callout as any).start_time,
        end_time: (callout as any).end_time,
        notes: (callout as any).notes,
        status: (callout as any).status,
        created_at: (callout as any).created_at,
        assigned_at: (callout as any).assigned_at,
        assigned_by: (callout as any).assigned_by,
        role_name: (callout as any).role?.name ?? '—',
        worker_name: workerName,
        worker_phone: workerPhone,
      });
      setLoading(false);
    })();
  }, [visible, calloutId]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerSide}
          >
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Shift Details</Text>
          <View style={styles.headerSide} />
        </View>

        {loading || !detail ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0E7C7B" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.roleName} numberOfLines={1} ellipsizeMode="tail">
                {detail.role_name}
              </Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[detail.status] + '22' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[detail.status] }]}>
                  {capitalize(detail.status.replace('_', ' '))}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Row label="Worker" value={detail.worker_name ?? (detail.worker_phone ? formatPhoneDisplay(detail.worker_phone) : '—')} />
              {detail.worker_name && detail.worker_phone && (
                <>
                  <Divider />
                  <Row label="Phone" value={formatPhoneDisplay(detail.worker_phone)} />
                </>
              )}
            </View>

            <View style={styles.card}>
              <Row label="Date" value={formatShiftDate(detail.shift_date)} />
              <Divider />
              <Row
                label="Time"
                value={`${formatShiftTime(detail.start_time)} – ${formatShiftTime(detail.end_time)}`}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={[styles.notesValue, !detail.notes && styles.notesEmpty]}>
                {detail.notes?.trim() || 'No notes'}
              </Text>
            </View>

            <View style={styles.card}>
              <Row label="Posted" value={formatTimestamp(detail.created_at)} />
              {detail.assigned_at && (
                <>
                  <Divider />
                  <Row label="Assigned" value={formatTimestamp(detail.assigned_at)} />
                </>
              )}
              {detail.assigned_by && (
                <>
                  <Divider />
                  <Row
                    label="Assigned by"
                    value={detail.assigned_by === 'auto' ? 'Auto-assigned' : 'Manager'}
                  />
                </>
              )}
            </View>

            <Text style={styles.footerNote}>
              Shift records are permanent and cannot be edited or deleted.
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  headerSide: { width: 60 },
  close: { color: '#7A8899', fontSize: 16 },
  title: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  content: { padding: 20, gap: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleName: { flex: 1, fontSize: 24, fontWeight: '700', color: '#fff' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 14, color: '#aaa', flexShrink: 0, minWidth: 96 },
  rowValue: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '700', textAlign: 'right', marginLeft: 16 },
  divider: { height: 1, backgroundColor: '#2a2a40', marginHorizontal: -16 },
  notesLabel: { fontSize: 14, color: '#aaa', paddingTop: 14 },
  notesValue: { fontSize: 15, color: '#fff', lineHeight: 22, paddingTop: 8, paddingBottom: 14 },
  notesEmpty: { color: '#666', fontStyle: 'italic' },
  footerNote: { fontSize: 12, color: '#555', textAlign: 'center', paddingTop: 4, paddingBottom: 24 },
});
