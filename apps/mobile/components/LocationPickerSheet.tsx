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
            <View style={styles.doneButton}>
              <Text style={styles.closeText}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {locations.map((loc) => {
            const isActive = loc.id === activeLocationId;
            return (
              <TouchableOpacity
                key={loc.id}
                onPress={() => {
                  onSelect(loc);
                  onClose();
                }}
              >
                <View style={[styles.locationRow, isActive && styles.locationRowActive]}>
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, isActive && styles.locationNameActive]}>
                      {loc.name}
                    </Text>
                    <Text style={styles.locationTier}>{tierLabel(loc.subscription_tier)}</Text>
                  </View>
                  {isActive && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.rowDivider} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footerDivider} />
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={handleAddLocationPress}>
            <View style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add another location</Text>
            </View>
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
    paddingBottom: 16,
  },
  headerDivider: { height: 1, backgroundColor: '#2a2a40' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },
  doneButton: { paddingLeft: 16, paddingRight: 20, paddingVertical: 4, minWidth: 90 },
  closeText: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingVertical: 8 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  locationRowActive: { backgroundColor: '#1a1a2e' },
  rowDivider: { height: 1, backgroundColor: '#1a1a2e' },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 17, fontWeight: '700', color: '#aaa', marginBottom: 3 },
  locationNameActive: { color: '#fff' },
  locationTier: { fontSize: 12, color: '#7A8899' },
  checkmark: { color: '#0E7C7B', fontSize: 18, fontWeight: '700', marginLeft: 12 },
  footerDivider: { height: 1, backgroundColor: '#2a2a40' },
  footer: { paddingHorizontal: 20, paddingTop: 20 },
  addButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
  },
  addButtonText: { color: '#7A8899', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
