import {useRef, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {colors, radius} from '../../lib/theme';

const LENGTH = 6;

interface Props {
  value: string[];
  onChange: (digits: string[]) => void;
}

// Six single-digit boxes; typing moves to the next one, backspace to the previous. The active box has a teal border.
export default function OtpInput({value, onChange}: Props) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [active, setActive] = useState(-1);

  const type = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
    if (text && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const backspace = (index: number) => {
    if (index === 0) {
      return;
    }
    const next = [...value];
    next[index - 1] = '';
    onChange(next);
    refs.current[index - 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {Array.from({length: LENGTH}, (_, i) => (
        <TextInput
          key={i}
          ref={el => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ''}
          style={[
            styles.input,
            !!value[i] && styles.filled,
            active === i && styles.active,
          ]}
          maxLength={1}
          keyboardType="number-pad"
          onFocus={() => setActive(i)}
          onBlur={() => setActive(-1)}
          onChangeText={text => type(i, text)}
          onKeyPress={({nativeEvent}) =>
            nativeEvent.key === 'Backspace' && !value[i] && backspace(i)
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', marginTop: 20, gap: 8},
  input: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: 'center',
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  filled: {borderColor: colors.primaryLight, backgroundColor: colors.tint},
  active: {borderColor: colors.primary, backgroundColor: '#fff'},
});
