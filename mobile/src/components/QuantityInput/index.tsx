import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  value: number;
  min?: number;
  max?: number;
  invalid?: boolean;
  onChange: (n: number) => void;
}

// Stepper: a "-" button, the number, a "+" button (1 to 10 people). A typed number is kept in range.
export default function QuantityInput({
  value,
  min = 1,
  max = 10,
  invalid,
  onChange,
}: Props) {
  const clamp = (n: number) =>
    Math.max(min, Math.min(max, Number.isNaN(n) ? min : n));
  const button = (name: string, disabled: boolean, delta: number) => (
    <TouchableOpacity
      style={[styles.step, disabled && styles.disabled]}
      disabled={disabled}
      onPress={() => onChange(clamp(value + delta))}
      accessibilityRole="button">
      <Ionicons
        name={name}
        size={22}
        color={disabled ? colors.border : colors.primaryDark}
      />
    </TouchableOpacity>
  );
  return (
    <View style={[styles.wrap, invalid && styles.invalid]}>
      {button('remove', value <= min, -1)}
      <TextInput
        value={String(value)}
        onChangeText={text => onChange(clamp(parseInt(text, 10)))}
        keyboardType="numeric"
        maxLength={2}
        style={styles.input}
      />
      {button('add', value >= max, 1)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  invalid: {borderColor: colors.error},
  step: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {opacity: 0.6},
  input: {
    minWidth: 56,
    height: '100%',
    textAlign: 'center',
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    backgroundColor: '#fff',
  },
});
