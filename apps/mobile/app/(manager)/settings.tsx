import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Location } from '../../types/database';
import TutorialModal from '../../components/TutorialModal';
import LoadingOverlay from '../../components/LoadingOverlay';
import ManageRolesSheet from '../../components/ManageRolesSheet';
import { useRouter } from 'expo-router';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://truvex.app';

function msUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.max(0, new Date(dateStr).getTime() - Date.now());
}

function formatTrialRemaining(dateStr: string | null): string | null {
  const ms = msUntil(dateStr);
  if (ms === null) return null;
  if (ms === 0) return 'ended';
  const totalMinutes = Math.ceil(ms / (1000 * 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} more minute${totalMinutes !== 1 ? 's' : ''}`;
  }
  const totalHours = Math.ceil(ms / (1000 * 60 * 60));
  if (totalHours < 24) {
    return `${totalHours} more hour${totalHours !== 1 ? 's' : ''}`;
  }
  const totalDays = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${totalDays} more day${totalDays !== 1 ? 's' : ''}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const msLeft = d.getTime() - Date.now();
  // For short trials (<24h), include the time; otherwise date only.
  if (msLeft > 0 && msLeft < 1000 * 60 * 60 * 24) {
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ManagerSettingsScreen() {
  const router = useRouter();
  const {
    session,
    profile,
    activeLocation,
    allLocations,
    setActiveLocation,
    setAllLocations,
    setMemberType,
    reset,
  } = useStore();
  const [location, setLocation] = useState<Location | null>(activeLocation);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState<'upgrade' | 'manage' | 'cancel' | 'reactivate' | null>(null);

  const refresh = useCallback(async () => {
    if (!activeLocation) return;
    const { data } = await supabase
      .schema('truvex').from('locations')
      .select('*')
      .eq('id', activeLocation.id)
      .single();
    if (data) {
      setLocation(data);
      setActiveLocation(data);
    }
  }, [activeLocation]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Listen for deep link after web subscription actions
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('upgrade-success') || url.includes('subscription-updated')) {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  async function handleUpgrade(tier: 'pro' | 'business') {
    if (!session || !location) return;
    const alreadySubscribed = !!(location as any).stripe_subscription_id;

    // Mid-subscription plan change: update the existing Stripe sub in place
    // so Stripe prorates the unused portion of the current plan. Routing
    // this through /checkout would create a second subscription and double
    // bill. Cadence (monthly vs annual) is preserved server-side.
    if (alreadySubscribed) {
      const isTrialing = (location as any).subscription_status === 'trialing';
      const planName = tier === 'business' ? 'Business' : 'Pro';
      const addsMessage =
        tier === 'business'
          ? 'Business adds:\n• Unlimited workers (Pro is limited to 30)\n• Analytics dashboard\n\n'
          : '';
      const chargeMessage = isTrialing
        ? `Upgrading now ends your free trial and your card will be charged for ${planName} immediately.`
        : `Stripe will credit the unused portion of your current plan and charge you the ${planName} rate for the rest of your billing period.`;

      Alert.alert(
        `Upgrade to ${planName}?`,
        `${addsMessage}${chargeMessage}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: async () => {
              setSubActionLoading('upgrade');
              try {
                const res = await fetch(`${WEB_URL}/api/subscription/change-plan`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ location_id: location.id, tier }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.ok) {
                  Alert.alert('Upgrade failed', data?.error ?? `Server error (${res.status})`);
                  return;
                }
                await refresh();
                Alert.alert(
                  'Plan changed',
                  data.trialEnded
                    ? `You're now on ${planName}. Your trial has ended and your card was charged with a proration credit applied.`
                    : `You're now on ${planName}. Your next invoice will credit any unused time from your previous plan.`,
                );
              } catch (err) {
                Alert.alert('Upgrade failed', err instanceof Error ? err.message : 'Network error');
              } finally {
                setSubActionLoading(null);
              }
            },
          },
        ]
      );
      return;
    }

    setSubActionLoading('upgrade');
    try {
      // Expo Go registers an exp:// scheme; standalone/dev-client uses truvex://.
      const returnTo = ExpoLinking.createURL('/upgrade-success');
      const res = await fetch(`${WEB_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          location_id: location.id,
          tier,
          billing: 'monthly',
          return_to: returnTo,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.checkoutUrl) {
        Alert.alert('Upgrade failed', data?.error ?? `Server error (${res.status})`);
        return;
      }
      // openAuthSessionAsync auto-dismisses the in-app browser when the
      // returnTo deep link fires. We're already on Settings, so no navigation
      // is needed — the sheet closes and the user is back where they started.
      const result = await WebBrowser.openAuthSessionAsync(data.checkoutUrl, returnTo);
      if (result.type === 'success') {
        await refresh();
      }
    } catch (err) {
      Alert.alert('Upgrade failed', err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubActionLoading(null);
    }
  }

  async function handleManageSubscription() {
    if (!session || !location) return;
    setSubActionLoading('manage');
    try {
      const returnTo = ExpoLinking.createURL('/upgrade-success');
      const res = await fetch(`${WEB_URL}/api/subscription/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ location_id: location.id, return_to: returnTo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.portalUrl) {
        Alert.alert('Could not open billing portal', data?.error ?? `Server error (${res.status})`);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.portalUrl, returnTo);
      if (result.type === 'success') {
        await refresh();
      }
    } catch (err) {
      Alert.alert('Could not open billing portal', err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubActionLoading(null);
    }
  }

  function handleReactivateSubscription() {
    if (!session || !location) return;
    Alert.alert(
      'Reactivate subscription?',
      'Your subscription will continue renewing at the end of the current billing period.',
      [
        { text: 'Keep cancelled', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            setSubActionLoading('reactivate');
            try {
              const res = await fetch(`${WEB_URL}/api/subscription/reactivate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ location_id: location.id }),
              });
              const data = await res.json().catch(() => null);
              if (!res.ok || !data?.ok) {
                Alert.alert('Could not reactivate', data?.error ?? `Server error (${res.status})`);
                return;
              }
              await refresh();
              Alert.alert('Subscription reactivated', 'Your plan will renew at the end of the current billing period.');
            } catch (err) {
              Alert.alert('Could not reactivate', err instanceof Error ? err.message : 'Network error');
            } finally {
              setSubActionLoading(null);
            }
          },
        },
      ]
    );
  }

  function handleCancelSubscription() {
    if (!session || !location) return;
    Alert.alert(
      'Cancel subscription?',
      'You will keep access until the end of your current billing period.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setSubActionLoading('cancel');
            try {
              const res = await fetch(`${WEB_URL}/api/subscription/cancel`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ location_id: location.id }),
              });
              const data = await res.json().catch(() => null);
              if (!res.ok || !data?.ok) {
                Alert.alert('Could not cancel', data?.error ?? `Server error (${res.status})`);
                return;
              }
              await refresh();
              Alert.alert('Subscription cancelled', "You'll keep access until the end of your current billing period.");
            } catch (err) {
              Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Network error');
            } finally {
              setSubActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  function handleDeleteRestaurant() {
    if (!location) return;
    Alert.alert(
      `Delete ${location.name}?`,
      'This cancels the subscription and removes all workers, roles, callouts, and history for this restaurant. Your account stays active. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            setDeleting(true);
            const { error } = await supabase.functions.invoke('delete-location', {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: { location_id: location.id },
            });
            setDeleting(false);
            if (error) {
              Alert.alert('Error', error.message ?? 'Failed to delete restaurant');
              return;
            }
            const remaining = allLocations.filter((l) => l.id !== location.id);
            setAllLocations(remaining);
            if (remaining.length > 0) {
              setActiveLocation(remaining[0]);
              router.replace('/(manager)/');
            } else {
              setActiveLocation(null);
              setMemberType(null);
              router.replace('/no-location');
            }
          },
        },
      ],
    );
  }

  const loc = location as any;
  const status: string = loc?.subscription_status ?? 'trialing';
  const tier: string = loc?.subscription_tier ?? 'free';
  const trialRemaining = formatTrialRemaining(loc?.trial_ends_at);
  const trialEnded = trialRemaining === 'ended';
  const periodEnd = loc?.subscription_period_end;
  // Subscribing during the free trial carries the remaining trial days over
  // to Stripe, so the subscription sits at status='trialing' until the first
  // charge. Key on stripe_subscription_id to distinguish "trialing + paid"
  // from "trialing + still on free trial" — the UI diverges sharply.
  const isSubscribed = !!loc?.stripe_subscription_id;

  const planLabel = tier === 'business' ? 'Business' : tier === 'pro' ? 'Pro' : 'Free';
  const planColor = tier === 'business' ? '#10b981' : tier === 'pro' ? '#0E7C7B' : '#6b7280';

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Restaurant */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Restaurant</Text>
        <View style={styles.card}>
          <Row label="Name" value={loc?.name ?? '—'} />
          <Divider />
          <TouchableOpacity style={styles.row} onPress={() => setShowRoles(true)}>
            <Text style={styles.rowLabel}>Roles</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleDeleteRestaurant} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color="#ef4444" style={{ paddingVertical: 8 }} />
          ) : (
            <Text style={styles.deleteRestaurantText}>Delete this restaurant</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <Text style={styles.rowLabel}>Current plan</Text>
            <View style={[styles.planBadge, { backgroundColor: planColor + '22' }]}>
              <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel}</Text>
            </View>
          </View>

          {status === 'trialing' && !isSubscribed && trialRemaining !== null && (
            <>
              <Divider />
              <Row
                label="Trial ends"
                value={formatDate(loc?.trial_ends_at)}
              />
              <View style={styles.trialNotice}>
                {!trialEnded ? (
                  <Text style={styles.trialText}>
                    Pro features are active for {trialRemaining}.
                    Subscribe before the trial ends to keep push & SMS notifications.
                  </Text>
                ) : (
                  <Text style={[styles.trialText, { color: '#ef4444' }]}>
                    Your Pro trial has ended. Subscribe to restore notifications.
                  </Text>
                )}
              </View>
            </>
          )}

          {status === 'trialing' && isSubscribed && (
            <>
              <Divider />
              <Row label="Billing starts" value={formatDate(loc?.trial_ends_at)} />
              <View style={styles.trialNotice}>
                <Text style={styles.trialText}>
                  You're subscribed. Your remaining trial days are free — billing starts automatically on {formatDate(loc?.trial_ends_at)}.
                </Text>
              </View>
            </>
          )}

          {status === 'active' && (
            <>
              <Divider />
              <Row label="Renews" value={formatDate(periodEnd)} />
            </>
          )}

          {status === 'cancelled' && (
            <>
              <Divider />
              <Row label="Active until" value={formatDate(periodEnd)} />
              <View style={styles.trialNotice}>
                <Text style={[styles.trialText, { color: '#f59e0b' }]}>
                  Subscription cancelled — access continues until {formatDate(periodEnd)}.
                </Text>
              </View>
            </>
          )}

          {status === 'past_due' && (
            <>
              <Divider />
              <View style={styles.trialNotice}>
                <Text style={[styles.trialText, { color: '#ef4444' }]}>
                  Payment failed. Update your payment method to restore access.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action buttons */}
        {!isSubscribed && (status === 'trialing' || status === 'expired' || tier === 'free') && (
          <View style={styles.upgradeCards}>
            <TouchableOpacity
              style={styles.upgradeCard}
              onPress={() => handleUpgrade('pro')}
              disabled={subActionLoading !== null}
            >
              <Text style={styles.upgradePlan}>Pro</Text>
              <Text style={styles.upgradePrice}>$49 / mo</Text>
              <Text style={styles.upgradeFeature}>Up to 30 workers</Text>
              <Text style={styles.upgradeFeature}>Push + SMS notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.upgradeCard, styles.upgradeCardPro]}
              onPress={() => handleUpgrade('business')}
              disabled={subActionLoading !== null}
            >
              <Text style={styles.upgradePlan}>Business</Text>
              <Text style={styles.upgradePrice}>$99 / mo</Text>
              <Text style={styles.upgradeFeature}>Unlimited workers</Text>
              <Text style={styles.upgradeFeature}>Push + SMS notifications</Text>
              <Text style={styles.upgradeFeature}>Analytics dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {isSubscribed && tier !== 'business' && (status === 'active' || status === 'trialing') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpgrade('business')}
            disabled={subActionLoading !== null}
          >
            {subActionLoading === 'upgrade' ? (
              <ActivityIndicator color="#0E7C7B" />
            ) : (
              <Text style={styles.actionButtonText}>Upgrade to Business</Text>
            )}
          </TouchableOpacity>
        )}

        {(isSubscribed || status === 'past_due') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleManageSubscription}
            disabled={subActionLoading !== null}
          >
            {subActionLoading === 'manage' ? (
              <ActivityIndicator color="#0E7C7B" />
            ) : (
              <Text style={styles.actionButtonText}>Manage payment method</Text>
            )}
          </TouchableOpacity>
        )}

        {isSubscribed && (status === 'active' || status === 'trialing') && (
          <TouchableOpacity onPress={handleCancelSubscription} disabled={subActionLoading !== null}>
            {subActionLoading === 'cancel' ? (
              <ActivityIndicator color="#ef4444" style={{ paddingVertical: 8 }} />
            ) : (
              <Text style={styles.cancelSubText}>Cancel subscription</Text>
            )}
          </TouchableOpacity>
        )}

        {status === 'cancelled' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReactivateSubscription}
            disabled={subActionLoading !== null}
          >
            {subActionLoading === 'reactivate' ? (
              <ActivityIndicator color="#0E7C7B" />
            ) : (
              <Text style={styles.actionButtonText}>Reactivate subscription</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Row label="Phone" value={session?.user?.phone ?? '—'} />
        </View>
      </View>

      {/* Help */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Help</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowTutorial(true)}>
            <Text style={styles.rowLabel}>Show app tutorial</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>

    <TutorialModal visible={showTutorial} role="manager" onClose={() => setShowTutorial(false)} />
    <ManageRolesSheet visible={showRoles} onClose={() => setShowRoles(false)} onSaved={refresh} />
    <LoadingOverlay
      visible={subActionLoading !== null || deleting}
      message={
        deleting
          ? 'Deleting restaurant…'
          : subActionLoading === 'upgrade'
          ? 'Opening Stripe checkout…'
          : subActionLoading === 'manage'
          ? 'Opening billing portal…'
          : subActionLoading === 'cancel'
          ? 'Cancelling subscription…'
          : undefined
      }
    />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { paddingBottom: 48 },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  section: { padding: 20, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  divider: { height: 1, backgroundColor: '#2a2a40', marginHorizontal: -16 },
  rowLabel: { fontSize: 15, color: '#aaa' },
  rowValue: { fontSize: 15, color: '#fff', fontWeight: '700' },
  planRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  planBadgeText: { fontSize: 13, fontWeight: '700' },
  trialNotice: { paddingBottom: 14, paddingTop: 4 },
  trialText: { fontSize: 13, color: '#888', lineHeight: 18 },
  upgradeCards: { flexDirection: 'row', gap: 12 },
  upgradeCard: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2a2a40', gap: 4,
  },
  upgradeCardPro: { borderColor: '#0E7C7B' },
  upgradePlan: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  upgradePrice: { fontSize: 20, fontWeight: '700', color: '#0E7C7B', marginBottom: 6 },
  upgradeFeature: { fontSize: 12, color: '#666' },
  actionButton: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a40',
  },
  actionButtonText: { color: '#0E7C7B', fontSize: 15, fontWeight: '700' },
  cancelSubText: { color: '#ef4444', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  deleteRestaurantText: { color: '#ef4444', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  signOutButton: { margin: 20, alignItems: 'center', paddingVertical: 14 },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  chevron: { fontSize: 20, color: '#555' },
});
