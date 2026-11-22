import {useState} from 'react';
import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius} from '../../lib/theme';
import FieldError from '../FieldError';

interface Props extends TextInputProps {
  label: string;
  // Ionicons name shown on the left
  icon?: string;
  error?: string | false;
}

// Small uppercase label, rounded input with a left icon (teal border while focused), red "* error" under it.
export default function FormInput({
  label,
  icon,
  error,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.box, focus && styles.focus, !!error && styles.invalid]}>
        {!!icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focus ? colors.primary : colors.faint}
            style={styles.icon}
          />
        )}
        <TextInput
          autoCapitalize="none"
          placeholderTextColor={colors.faint}
          secureTextEntry={secureTextEntry && !show}
          style={styles.input}
          onFocus={e => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocus(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry && (
          <Ionicons
            name={show ? 'eye' : 'eye-off'}
            size={22}
            color={colors.faint}
            onPress={() => setShow(s => !s)}
            style={styles.eye}
          />
        )}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: 14},
  label: {
    color: colors.label,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  focus: {borderColor: colors.primary, backgroundColor: '#fff'},
  invalid: {borderColor: colors.error},
  icon: {marginRight: 10},
  input: {flex: 1, height: '100%', color: colors.text, fontSize: 15},
  eye: {paddingLeft: 8},
});
