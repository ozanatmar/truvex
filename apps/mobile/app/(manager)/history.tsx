import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatShiftTime, formatShiftDate, formatPhoneDisplay } from '../../lib/utils';
import CalloutDetailSheet from '../../components/CalloutDetailSheet';

const STATUS_COLORS: Record<string, string> = {
  open: '#0E7C7B',
  pending_selection: '#f59e0b',
  filled: '#10b981',
  cancelled: '#6b7280',
  expired: '#6b7280',
};

interface HistoryRow {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  role_name: string;
  worker_label: string | null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ManagerHistoryScreen() {
  const { activeLocation } = useStore();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeLocation) return;

    const { data: callouts } = await supabase
      .schema('truvex').from('callouts')
      .select('*, role:roles(*)')
      .eq('location_id', activeLocation.id)
      .in('status', ['filled', 'cancelled', 'expired'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!callouts) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const workerIds = Array.from(
      new Set(
        callouts
          .map((c: any) => c.assigned_worker_id)
          .filter((id: string | null): id is string => !!id),
      ),
    );

    const [{ data: profiles }, { data: members }] = await Promise.all([
      workerIds.length > 0
        ? supabase.schema('truvex').from('profiles').select('id, name, phone').in('id', workerIds)
        : Promise.resolve({ data: [] as any[] }),
      workerIds.length > 0
        ? supabase.schema('truvex').from('location_members')
            .select('user_id, invited_name')
            .eq('location_id', activeLocation.id)
            .in('user_id', workerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    const memberByUser = new Map<string, any>((members ?? []).map((m: any) => [m.user_id, m]));

    setRows(
      callouts.map((c: any) => {
        const assignedId = c.assigned_worker_id as string | null;
        let workerLabel: string | null = null;
        if (assignedId) {
          const p = profileById.get(assignedId);
          const m = memberByUser.get(assignedId);
          workerLabel = m?.invited_name ?? p?.name ?? (p?.phone ? formatPhoneDisplay(p.phone) : null);
        }
        return {
          id: c.id,
          shift_date: c.shift_date,
          start_time: c.start_time,
          end_time: c.end_time,
          status: c.status,
          role_name: c.role?.name ?? '—',
          worker_label: workerLabel,
        };
      }),
    );
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0E7C7B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            tintColor="#0E7C7B"
          />
        }
      >
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Filled and cancelled callouts appear here.</Text>
          </View>
        ) : (
          rows.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedId(r.id)}
              activeOpacity={0.7}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Text style={styles.roleName}>{r.role_name + '   '}</Text>
                    {r.worker_label && (
                      <Text style={styles.workerName} numberOfLines={1}>
                        · {r.worker_label}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLORS[r.status] + '22' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLORS[r.status] }]}>
                      {capitalize(r.status.replace('_', ' '))}
                    </Text>
                  </View>
                </View>
                <Text style={styles.date}>{formatShiftDate(r.shift_date)}</Text>
                <Text style={styles.time}>
                  {formatShiftTime(r.start_time)} – {formatShiftTime(r.end_time)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <CalloutDetailSheet
        visible={selectedId !== null}
        calloutId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 8 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  roleName: { fontSize: 16, fontWeight: '700', color: '#fff', flexShrink: 0, marginRight: 6 },
  workerName: { fontSize: 14, color: '#aaa', fontWeight: '500', flexShrink: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  date: { fontSize: 13, color: '#aaa' },
  time: { fontSize: 13, color: '#ccc', fontWeight: '600' },
});
