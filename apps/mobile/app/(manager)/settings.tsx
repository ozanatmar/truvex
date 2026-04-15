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
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Location } from '../../types/database';
import TutorialModal from '../../components/TutorialModal';

const WEB_URL = 'https://truvex-web.vercel.app';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ManagerSettingsScreen() {
  const { session, activeLocation, setActiveLocation, reset } = useStore();
  const [location, setLocation] = useState<Location | null>(activeLocation);
  const [showTutorial, setShowTutorial] = useState(false);

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
      if (url === 'truvex://upgrade-success' || url === 'truvex://subscription-updated') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  function handleUpgrade(tier: 'starter' | 'pro') {
    const url = `${WEB_URL}/upgrade?location_id=${location?.id}&tier=${tier}`;
    Linking.openURL(url);
  }

  function handleManageSubscription() {
    const url = `${WEB_URL}/subscription?location_id=${location?.id}`;
    Linking.openURL(url);
  }

  function handleCancelSubscription() {
    Alert.alert(
      'Cancel subscription?',
      'You will keep access until the end of your current billing period.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            const url = `${WEB_URL}/subscription/cancel?location_id=${location?.id}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  const loc = location as any;
  const status: string = loc?.subscription_status ?? 'trialing';
  const tier: string = loc?.subscription_tier ?? 'free';
  const trialDays = daysUntil(loc?.trial_ends_at);
  const periodEnd = loc?.subscription_period_end;

  const planLabel = tier === 'pro' ? 'Pro' : tier === 'starter' ? 'Starter' : 'Free';
  const planColor = tier === 'pro' ? '#10b981' : tier === 'starter' ? '#4f46e5' : '#6b7280';

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
        </View>
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

          {status === 'trialing' && trialDays !== null && (
            <>
              <Divider />
              <Row
                label="Trial ends"
                value={formatDate(loc?.trial_ends_at)}
              />
              <View style={styles.trialNotice}>
                {trialDays > 0 ? (
                  <Text style={styles.trialText}>
                    {trialDays} day{trialDays !== 1 ? 's' : ''} left in your trial.
                    Add a payment method to keep push & SMS after it ends.
                  </Text>
                ) : (
                  <Text style={[styles.trialText, { color: '#ef4444' }]}>
                    Your trial has ended. Upgrade to restore notifications.
                  </Text>
                )}
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
        {(status === 'trialing' || status === 'expired' || tier === 'free') && (
          <View style={styles.upgradeCards}>
            <TouchableOpacity style={styles.upgradeCard} onPress={() => handleUpgrade('starter')}>
              <Text style={styles.upgradePlan}>Starter</Text>
              <Text style={styles.upgradePrice}>$49 / mo</Text>
              <Text style={styles.upgradeFeature}>Up to 30 workers</Text>
              <Text style={styles.upgradeFeature}>Push + SMS notifications</Text>
              <Text style={styles.upgradeFeature}>14-day free trial</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.upgradeCard, styles.upgradeCardPro]} onPress={() => handleUpgrade('pro')}>
              <Text style={styles.upgradePlan}>Pro</Text>
              <Text style={styles.upgradePrice}>$99 / mo</Text>
              <Text style={styles.upgradeFeature}>Unlimited workers</Text>
              <Text style={styles.upgradeFeature}>Push + SMS notifications</Text>
              <Text style={styles.upgradeFeature}>14-day free trial</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'active' && tier !== 'pro' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleUpgrade('pro')}>
            <Text style={styles.actionButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}

        {(status === 'active' || status === 'past_due') && (
          <TouchableOpacity style={styles.actionButton} onPress={handleManageSubscription}>
            <Text style={styles.actionButtonText}>Manage payment method</Text>
          </TouchableOpacity>
        )}

        {status === 'active' && (
          <TouchableOpacity onPress={handleCancelSubscription}>
            <Text style={styles.cancelSubText}>Cancel subscription</Text>
          </TouchableOpacity>
        )}

        {status === 'cancelled' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleManageSubscription}>
            <Text style={styles.actionButtonText}>Reactivate subscription</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Row label="Phone" value={loc?.manager_phone ?? session?.user?.phone ?? '—'} />
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
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  section: { padding: 20, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 14, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  divider: { height: 1, backgroundColor: '#2a2a40', marginHorizontal: -16 },
  rowLabel: { fontSize: 15, color: '#aaa' },
  rowValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
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
  upgradeCardPro: { borderColor: '#4f46e5' },
  upgradePlan: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  upgradePrice: { fontSize: 20, fontWeight: '800', color: '#4f46e5', marginBottom: 6 },
  upgradeFeature: { fontSize: 12, color: '#666' },
  actionButton: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a40',
  },
  actionButtonText: { color: '#4f46e5', fontSize: 15, fontWeight: '700' },
  cancelSubText: { color: '#ef4444', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  signOutButton: { margin: 20, alignItems: 'center', paddingVertical: 14 },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#555' },
});
