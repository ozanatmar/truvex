import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { CalloutWithRole } from '../../types/database';
import { formatShiftTime, formatShiftDate } from '../../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  open: '#4f46e5',
  pending_selection: '#f59e0b',
  filled: '#10b981',
  cancelled: '#6b7280',
  expired: '#6b7280',
};

export default function ManagerHistoryScreen() {
  const { activeLocation } = useStore();
  const [callouts, setCallouts] = useState<CalloutWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeLocation) return;

    const { data } = await supabase
      .schema('truvex').from('callouts')
      .select('*, role:roles(*), location:locations(*)')
      .eq('location_id', activeLocation.id)
      .in('status', ['filled', 'cancelled', 'expired'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setCallouts(data as CalloutWithRole[]);
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" />
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
            tintColor="#4f46e5"
          />
        }
      >
        {callouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Filled and cancelled callouts appear here.</Text>
          </View>
        ) : (
          callouts.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.roleName}>{c.role.name}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[c.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[c.status] }]}>
                    {c.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{formatShiftDate(c.shift_date)}</Text>
              <Text style={styles.time}>
                {formatShiftTime(c.start_time)} – {formatShiftTime(c.end_time)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
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
  card: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roleName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  date: { fontSize: 13, color: '#aaa' },
  time: { fontSize: 13, color: '#ccc', fontWeight: '600' },
});
