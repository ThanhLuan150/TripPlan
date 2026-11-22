import {StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  icon: string;
  text: string;
}

// Big soft-teal icon over a short message, for lists with nothing in them yet.
export default function EmptyState({icon, text}: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.circle}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24},
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
