import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../lib/store';
import { WorkerWithRoles } from '../../../types/database';
import { formatPhoneDisplay } from '../../../lib/utils';
import AddWorkerSheet from '../../../components/AddWorkerSheet';
import EditWorkerSheet from '../../../components/EditWorkerSheet';

export default function TeamScreen() {
  const router = useRouter();
  const { activeLocation } = useStore();
  const [workers, setWorkers] = useState<WorkerWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    if (!activeLocation) return;

    // Fetch members (no join — avoid RLS join complications)
    const { data: members, error: membersError } = await supabase
      .schema('truvex').from('location_members')
      .select('*')
      .eq('location_id', activeLocation.id)
      .eq('member_type', 'worker')
      .order('created_at', { ascending: true });

    if (membersError) {
      Alert.alert('Fetch error', membersError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!members || members.length === 0) {
      setWorkers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Fetch profiles for members that have a user_id
    const userIds = members.map((m: any) => m.user_id).filter(Boolean);
    const { data: profiles } = userIds.length > 0
      ? await supabase.schema('truvex').from('profiles').select('*').in('id', userIds)
      : { data: [] };

    // Fetch worker_roles (claimed workers) and the location's role list
    // (for synthesising roles on pending invites — their role is stored on
    // the member row and only promoted to worker_roles after claim).
    const [{ data: allRoles }, { data: locationRoles }] = await Promise.all([
      supabase.schema('truvex').from('worker_roles')
        .select('*, role:roles(*)')
        .eq('location_id', activeLocation.id),
      supabase.schema('truvex').from('roles')
        .select('*')
        .eq('location_id', activeLocation.id),
    ]);
    const roleById = new Map<string, any>((locationRoles ?? []).map((r: any) => [r.id, r]));

    setWorkers(
      members.map((m: any) => {
        const profile = (profiles ?? []).find((p: any) => p.id === m.user_id);
        const claimedRoles = (allRoles ?? []).filter((r: any) => r.user_id === m.user_id);
        const pendingRoles = !m.user_id
          ? [
              ...(m.primary_role_id && roleById.has(m.primary_role_id)
                ? [{ role_id: m.primary_role_id, is_primary: true, role: roleById.get(m.primary_role_id) }]
                : []),
              ...((m.additional_role_ids ?? []) as string[])
                .filter((rid) => roleById.has(rid))
                .map((rid) => ({ role_id: rid, is_primary: false, role: roleById.get(rid) })),
            ]
          : [];
        return {
          id: profile?.id ?? m.id,
          name: m.invited_name ?? profile?.name ?? null,
          phone: profile?.phone ?? m.invited_phone ?? '',
          member: m,
          roles: claimedRoles.length > 0 ? claimedRoles : pendingRoles,
        };
      })
    );
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  useFocusEffect(useCallback(() => {
    fetchWorkers();
  }, [fetchWorkers]));

  async function handleRemove(memberRowId: string, userId: string | null, workerName: string) {
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
              .schema('truvex').from('location_members')
              .delete()
              .eq('id', memberRowId);

            if (userId) {
              await supabase
                .schema('truvex').from('worker_roles')
                .delete()
                .eq('location_id', activeLocation!.id)
                .eq('user_id', userId);
            }

            fetchWorkers();
          },
        },
      ]
    );
  }

  async function toggleMute(memberRowId: string, isMuted: boolean) {
    await supabase
      .schema('truvex').from('location_members')
      .update({ is_muted: !isMuted })
      .eq('id', memberRowId);

    fetchWorkers();
  }

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
        <View>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.workerCount}>{workers.length} worker{workers.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <AddWorkerSheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={fetchWorkers}
        onOpenUpgrade={() => router.push('/(manager)/settings')}
      />

      <EditWorkerSheet
        visible={editWorkerId !== null}
        workerId={editWorkerId}
        onClose={() => setEditWorkerId(null)}
        onSaved={fetchWorkers}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchWorkers(); }}
            tintColor="#0E7C7B"
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
                  onPress={() => setEditWorkerId(worker.id)}
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
                    onPress={() => toggleMute(worker.member.id, worker.member.is_muted)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>
                      {worker.member.is_muted ? 'Unmute' : 'Mute'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(worker.member.id, worker.member.user_id, worker.name ?? worker.phone)}
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
  workerCount: { fontSize: 12, color: '#7A8899', marginTop: 2 },
  addButton: {
    backgroundColor: '#F5853F',
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
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, overflow: 'hidden' },
  cardMain: { padding: 16 },
  workerInfo: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pendingBadge: { backgroundColor: '#f59e0b22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pendingText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  mutedBadge: { backgroundColor: '#6b728022', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  mutedText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  roleText: { fontSize: 13, color: '#7A8899', fontWeight: '600' },
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
  actionText: { fontSize: 13, color: '#7A8899', fontWeight: '600' },
  removeText: { color: '#ef4444' },
});
