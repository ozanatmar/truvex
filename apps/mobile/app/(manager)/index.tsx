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
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { CalloutWithRole, Location } from '../../types/database';
import { formatShiftTime } from '../../lib/utils';
import LocationPickerSheet from '../../components/LocationPickerSheet';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending_selection: 'Awaiting selection',
  filled: 'Filled',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#0E7C7B',
  pending_selection: '#f59e0b',
  filled: '#10b981',
  cancelled: '#6b7280',
  expired: '#6b7280',
};

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { activeLocation, allLocations, setActiveLocation } = useStore();
  const [callouts, setCallouts] = useState<CalloutWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchCallouts = useCallback(async () => {
    if (!activeLocation) return;

    const { data } = await supabase
      .schema('truvex').from('callouts')
      .select('*, role:roles(*), location:locations(*)')
      .eq('location_id', activeLocation.id)
      .in('status', ['open', 'pending_selection'])
      .order('created_at', { ascending: false });

    if (data) setCallouts(data as CalloutWithRole[]);
    setLoading(false);
    setRefreshing(false);
  }, [activeLocation]);

  // Refresh list every time the screen comes into focus
  useFocusEffect(useCallback(() => {
    fetchCallouts();
  }, [fetchCallouts]));

  useEffect(() => {
    if (!activeLocation) return;

    const channel = supabase
      .channel(`manager-callouts:${activeLocation.id}:${Date.now()}`)
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

    return () => { supabase.removeChannel(channel); };
  }, [activeLocation, fetchCallouts]);

  async function handleCancel(calloutId: string) {
    Alert.alert('Cancel shift?', 'This will notify any workers who accepted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel shift',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .schema('truvex').from('callouts')
            .update({ status: 'cancelled' })
            .eq('id', calloutId);
          fetchCallouts();
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

  const loc = activeLocation as any;
  const subStatus: string = loc?.subscription_status ?? 'trialing';
  const tier: string = loc?.subscription_tier ?? 'free';
  const trialDays = loc?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(loc.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const periodEnd = loc?.subscription_period_end ? new Date(loc.subscription_period_end) : null;
  const inGracePeriod = subStatus === 'cancelled' && periodEnd !== null && periodEnd.getTime() > Date.now();
  // Stripe honors the unused trial days as trial_end on the new subscription,
  // so a subscribed manager stays in status='trialing' until the first charge.
  // Treat any location with stripe_subscription_id as subscribed — no upsell.
  const isSubscribed = !!loc?.stripe_subscription_id;

  const showBanner =
    (subStatus === 'trialing' && !isSubscribed) ||
    subStatus === 'past_due' ||
    subStatus === 'expired' ||
    subStatus === 'cancelled' ||
    (tier === 'free' && !isSubscribed && subStatus !== 'cancelled');
  let bannerText = '';
  let bannerColor = '#f59e0b';
  if (subStatus === 'trialing' && !isSubscribed && trialDays !== null) {
    bannerText = trialDays > 0 ? `Trial — ${trialDays}d left · Tap Settings to upgrade` : 'Trial ended · Tap Settings to upgrade';
  } else if (subStatus === 'past_due') {
    bannerText = 'Payment failed · Update in Settings';
    bannerColor = '#ef4444';
  } else if (inGracePeriod) {
    const endDate = periodEnd!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    bannerText = `Cancelled — paid access until ${endDate}`;
  } else if (subStatus === 'cancelled') {
    bannerText = 'Subscription cancelled · Tap Settings to reactivate';
  } else if (tier === 'free' || subStatus === 'expired') {
    bannerText = 'Free plan — notifications off · Tap Settings to upgrade';
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => allLocations.length > 1 && setShowPicker(true)}
          activeOpacity={allLocations.length > 1 ? 0.7 : 1}
        >
          <Text style={styles.locationName}>
            {activeLocation?.name}{allLocations.length > 1 ? ' ▾' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postButton}
          onPress={() => router.push('/(manager)/post-callout')}
        >
          <Text style={styles.postButtonText}>+ Post Callout</Text>
        </TouchableOpacity>
      </View>

      <LocationPickerSheet
        visible={showPicker}
        locations={allLocations}
        activeLocationId={activeLocation?.id ?? ''}
        onSelect={(loc: Location) => setActiveLocation(loc)}
        onClose={() => setShowPicker(false)}
        onAddLocation={() => {
          setShowPicker(false);
          router.push('/onboarding/restaurant');
        }}
      />

      {showBanner && (
        <TouchableOpacity
          style={[styles.banner, { backgroundColor: bannerColor + '22', borderBottomColor: bannerColor + '44' }]}
          onPress={() => router.push('/(manager)/settings')}
        >
          <Text style={[styles.bannerText, { color: bannerColor }]}>{bannerText}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCallouts(); }} tintColor="#0E7C7B" />
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
                <Text style={styles.notes} numberOfLines={1}>{callout.notes}</Text>
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
  locationName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  postButton: {
    backgroundColor: '#F5853F',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bannerText: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: '#666' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roleName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  shiftDate: { fontSize: 14, color: '#aaa' },
  shiftTime: { fontSize: 14, color: '#ccc', fontWeight: '600' },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelLink: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
