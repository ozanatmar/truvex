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
import { WorkerWithRoles } from '../../types/database';
import { formatPhoneDisplay } from '../../lib/utils';

export default function TeamScreen() {
  const router = useRouter();
  const { activeLocation } = useStore();
  const [workers, setWorkers] = useState<WorkerWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = useCallback(async () => {
    if (!activeLocation) return;

    const { data } = await supabase
      .from('truvex.location_members')
      .select(`
        *,
        user:truvex.profiles(*),
        roles:truvex.worker_roles(*, role:truvex.roles(*))
      `)
      .eq('location_id', activeLocation.id)
      .eq('member_type', 'worker')
      .order('created_at', { ascending: true });

    if (data) {
      setWorkers(
        data.map((m: any) => ({
          ...m.user,
          member: m,
          roles: m.roles ?? [],
        }))
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  async function handleRemove(workerId: string, workerName: string) {
    Alert.alert(
      `Remove ${workerName}?`,
      'They will lose access to this location\'s callouts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('truvex.location_members')
              .delete()
              .eq('location_id', activeLocation!.id)
              .eq('user_id', workerId);

            await supabase
              .from('truvex.worker_roles')
              .delete()
              .eq('location_id', activeLocation!.id)
              .eq('user_id', workerId);

            fetchWorkers();
          },
        },
      ]
    );
  }

  async function toggleMute(workerId: string, isMuted: boolean) {
    await supabase
      .from('truvex.location_members')
      .update({ is_muted: !isMuted })
      .eq('location_id', activeLocation!.id)
      .eq('user_id', workerId);

    fetchWorkers();
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
        <Text style={styles.title}>Team</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(manager)/team/add')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchWorkers(); }}
            tintColor="#4f46e5"
          />
        }
      >
        {workers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No workers yet</Text>
            <Text style={styles.emptySubtitle}>Add your first worker to get started.</Text>
          </View>
        ) : (
          workers.map((worker) => {
            const primaryRole = worker.roles.find((r) => r.is_primary)?.role?.name;
            const additionalRoles = worker.roles
              .filter((r) => !r.is_primary)
              .map((r) => r.role?.name)
              .filter(Boolean);

            return (
              <View key={worker.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => router.push(`/(manager)/team/${worker.id}`)}
                >
                  <View style={styles.workerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.workerName}>{worker.name ?? formatPhoneDisplay(worker.phone)}</Text>
                      {worker.member.status === 'pending' && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      )}
                      {worker.member.is_muted && (
                        <View style={styles.mutedBadge}>
                          <Text style={styles.mutedText}>Muted</Text>
                        </View>
                      )}
                    </View>
                    {primaryRole && <Text style={styles.roleText}>{primaryRole}</Text>}
                    {additionalRoles.length > 0 && (
                      <Text style={styles.additionalRoles}>Also: {additionalRoles.join(', ')}</Text>
                    )}
                    <Text style={styles.phoneText}>{formatPhoneDisplay(worker.phone)}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => toggleMute(worker.id, worker.member.is_muted)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>
                      {worker.member.is_muted ? 'Unmute' : 'Mute'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(worker.id, worker.name ?? worker.phone)}
                    style={styles.actionButton}
                  >
                    <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  addButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: '#666' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 14, overflow: 'hidden' },
  cardMain: { padding: 16 },
  workerInfo: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pendingBadge: { backgroundColor: '#f59e0b22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pendingText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  mutedBadge: { backgroundColor: '#6b728022', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  mutedText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  roleText: { fontSize: 13, color: '#8888aa', fontWeight: '600' },
  additionalRoles: { fontSize: 12, color: '#555' },
  phoneText: { fontSize: 12, color: '#555', marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2a2a40',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: { fontSize: 13, color: '#8888aa', fontWeight: '600' },
  removeText: { color: '#ef4444' },
});
