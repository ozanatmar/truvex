import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { CalloutWithRole } from '../../types/database';
import { formatShiftTime } from '../../lib/utils';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending_selection: 'Awaiting selection',
  filled: 'Filled',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#4f46e5',
  pending_selection: '#f59e0b',
  filled: '#10b981',
  cancelled: '#6b7280',
  expired: '#6b7280',
};

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { activeLocation, session } = useStore();
  const [callouts, setCallouts] = useState<CalloutWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallouts = useCallback(async () => {
    if (!activeLocation) return;

    const { data } = await supabase
      .from('truvex.callouts')
      .select('*, role:truvex.roles(*), location:truvex.locations(*)')
      .eq('location_id', activeLocation.id)
      .in('status', ['open', 'pending_selection'])
      .order('created_at', { ascending: false });

    if (data) setCallouts(data as CalloutWithRole[]);
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  useEffect(() => {
    fetchCallouts();

    if (!activeLocation) return;

    // Realtime subscription
    const channel = supabase
      .channel('manager-callouts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'truvex',
          table: 'callouts',
          filter: `location_id=eq.${activeLocation.id}`,
        },
        () => fetchCallouts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLocation, fetchCallouts]);

  async function handleCancel(calloutId: string) {
    Alert.alert('Cancel shift?', 'This will notify any workers who accepted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel shift',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('truvex.callouts')
            .update({ status: 'cancelled' })
            .eq('id', calloutId);
        },
      },
    ]);
  }

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
        <View>
          <Text style={styles.locationName}>{activeLocation?.name}</Text>
          <Text style={styles.headerSubtitle}>Manager</Text>
        </View>
        <TouchableOpacity
          style={styles.postButton}
          onPress={() => router.push('/(manager)/post-callout')}
        >
          <Text style={styles.postButtonText}>+ Post Callout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCallouts(); }} tintColor="#4f46e5" />
        }
      >
        {callouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active callouts</Text>
            <Text style={styles.emptySubtitle}>Post a callout when a worker calls in.</Text>
          </View>
        ) : (
          callouts.map((callout) => (
            <TouchableOpacity
              key={callout.id}
              style={styles.card}
              onPress={() => router.push(`/(manager)/callout/${callout.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.roleName}>{callout.role.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[callout.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[callout.status] }]}>
                    {STATUS_LABELS[callout.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.shiftDate}>
                {new Date(callout.shift_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.shiftTime}>
                {formatShiftTime(callout.start_time)} – {formatShiftTime(callout.end_time)}
              </Text>

              {callout.notes ? (
                <Text style={styles.notes} numberOfLines={1}>
                  {callout.notes}
                </Text>
              ) : null}

              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleCancel(callout.id)}>
                  <Text style={styles.cancelLink}>Cancel shift</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  locationName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shiftDate: {
    fontSize: 14,
    color: '#aaa',
  },
  shiftTime: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  notes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelLink: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
