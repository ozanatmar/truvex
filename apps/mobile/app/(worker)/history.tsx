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
import { formatShiftTime, formatShiftDate } from '../../lib/utils';
import CalloutDetailSheet from '../../components/CalloutDetailSheet';

interface HistoryRow {
  id: string;
  callout_id: string;
  response: string;
  responded_at: string;
  callout: {
    shift_date: string;
    start_time: string;
    end_time: string;
    status: string;
    role: { name: string };
    location: { name: string };
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function WorkerHistoryScreen() {
  const { session } = useStore();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!session) return;

    const { data } = await supabase
      .schema('truvex').from('callout_responses')
      .select(`
        *,
        callout:callouts(
          shift_date, start_time, end_time, status,
          role:roles(name),
          location:locations(name)
        )
      `)
      .eq('worker_id', session.user.id)
      .eq('response', 'accepted')
      .order('responded_at', { ascending: false })
      .limit(50);

    if (data) setRows((data as HistoryRow[]).filter((r) => r.callout));
    setLoading(false);
    setRefreshing(false);
  }, [session]);

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
        <Text style={styles.title}>My History</Text>
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
            <Text style={styles.emptySubtitle}>Shifts you accept will appear here.</Text>
          </View>
        ) : (
          rows.map((row) => (
            <TouchableOpacity
              key={row.id}
              style={styles.card}
              onPress={() => setSelectedId(row.callout_id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.roleName} numberOfLines={1} ellipsizeMode="tail">{row.callout.role.name}</Text>
                <Text style={[
                  styles.status,
                  row.callout.status === 'filled' && styles.statusFilled,
                  row.callout.status === 'cancelled' && styles.statusCancelled,
                ]}>
                  {capitalize(row.callout.status.replace('_', ' '))}
                </Text>
              </View>
              <Text style={styles.locationName}>{row.callout.location.name}</Text>
              <Text style={styles.date}>{formatShiftDate(row.callout.shift_date)}</Text>
              <Text style={styles.time}>
                {formatShiftTime(row.callout.start_time)} – {formatShiftTime(row.callout.end_time)}
              </Text>
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
  content: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: '#666' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 16, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roleName: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  status: { fontSize: 12, color: '#aaa', fontWeight: '600', minWidth: 72, textAlign: 'right' },
  statusFilled: { color: '#10b981' },
  statusCancelled: { color: '#6b7280' },
  locationName: { fontSize: 13, color: '#666' },
  date: { fontSize: 13, color: '#aaa' },
  time: { fontSize: 13, color: '#ccc', fontWeight: '600' },
});
