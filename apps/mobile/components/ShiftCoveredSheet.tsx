import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
}

export default function ShiftCoveredSheet({ visible, title, subtitle, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.container} onPress={onClose}>
        <View style={styles.circle}>
          <Ionicons name="checkmark" size={72} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.hint}>Tap to dismiss</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
    minWidth: 260,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffffcc',
    textAlign: 'center',
    lineHeight: 22,
    alignSelf: 'stretch',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: '#ffffff80',
    minWidth: 120,
    textAlign: 'center',
  },
});
