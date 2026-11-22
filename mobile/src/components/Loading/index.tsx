import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {colors, shadow} from '../../lib/theme';

// Teal spinner on a small white card, centred in the available space.
export default function Loading() {
  return (
    <View style={s.center}>
      <View style={[s.card, shadow]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
