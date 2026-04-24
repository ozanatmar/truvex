import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Location } from '../types/database';

interface Props {
  visible: boolean;
  locations: Location[];
  activeLocationId: string;
  onSelect: (location: Location) => void;
  onClose: () => void;
  onAddLocation: () => void;
}

export default function LocationPickerSheet({
  visible,
  locations,
  activeLocationId,
  onSelect,
  onClose,
  onAddLocation,
}: Props) {
  const insets = useSafeAreaInsets();
  function handleAddLocationPress() {
    onAddLocation();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Switch Location</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {locations.map((loc) => {
            const isActive = loc.id === activeLocationId;
            return (
              <TouchableOpacity
                key={loc.id}
                style={[styles.locationRow, isActive && styles.locationRowActive]}
                onPress={() => {
                  onSelect(loc);
                  onClose();
                }}
              >
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationName, isActive && styles.locationNameActive]}>
                    {loc.name}
                  </Text>
                  <Text style={styles.locationTier}>{tierLabel(loc.subscription_tier)}</Text>
                </View>
                {isActive && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddLocationPress}>
            <Text style={styles.addButtonText}>+ Add another location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function tierLabel(tier: string): string {
  if (tier === 'business') return 'Business';
  if (tier === 'pro') return 'Pro';
  return 'Free';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // paddingTop applied inline from safe-area inset + 16.
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a40',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeText: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingVertical: 8 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  locationRowActive: { backgroundColor: '#1a1a2e' },
  locationInfo: { gap: 3 },
  locationName: { fontSize: 17, fontWeight: '700', color: '#aaa' },
  locationNameActive: { color: '#fff' },
  locationTier: { fontSize: 12, color: '#7A8899' },
  checkmark: { color: '#0E7C7B', fontSize: 18, fontWeight: '700' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a40',
  },
  addButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  addButtonText: { color: '#7A8899', fontSize: 15, fontWeight: '600' },
});
