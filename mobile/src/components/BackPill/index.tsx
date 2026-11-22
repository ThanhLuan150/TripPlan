import {StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, shadowLift} from '../../lib/theme';

// Teal half-round "back" tab pinned to the left edge of the trip screens.
export default function BackPill({
  onPress,
  top = 40,
}: {
  onPress: () => void;
  top?: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.pill, shadowLift, {top}]}
      onPress={onPress}>
      <Ionicons name="arrow-back" size={20} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    zIndex: 5,
    left: 0,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
});
