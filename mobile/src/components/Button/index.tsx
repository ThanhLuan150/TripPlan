import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, gradient, radius, shadowLift} from '../../lib/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
}

// Teal gradient button with a soft glow (outline variant: white with a teal border).
export default function Button({
  title,
  onPress,
  loading,
  variant = 'solid',
  style,
}: Props) {
  const solid = variant === 'solid';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={loading}
      style={[styles.wrap, solid && shadowLift, style]}>
      <LinearGradient
        colors={solid ? gradient : ['#fff', '#fff']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.button, !solid && styles.outline]}>
        {loading ? (
          <ActivityIndicator color={solid ? '#fff' : colors.primary} />
        ) : (
          <Text style={[styles.text, !solid && styles.outlineText]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: radius.md,
  },
  button: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {borderWidth: 1.5, borderColor: colors.primary},
  text: {color: '#fff', fontWeight: '700', fontSize: 18, letterSpacing: 0.3},
  outlineText: {color: colors.primary},
});
