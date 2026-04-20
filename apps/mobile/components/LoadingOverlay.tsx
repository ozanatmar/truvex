import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';

interface Props {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { /* block back button while loading */ }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#F5853F" />
          {message ? <Text style={styles.text}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 26, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 14,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
