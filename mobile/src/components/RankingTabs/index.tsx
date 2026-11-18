import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, shadow} from '../../lib/theme';

interface Props<T extends string> {
  options: {value: T; label: string}[];
  value: T;
  onChange: (v: T) => void;
}

// Pill switch (by week / month / points); the chosen one is a teal pill.
export default function RankingTabs<T extends string>({options, value, onChange}: Props<T>) {
  return (
    <View style={[styles.track, shadow]}>
      {options.map(o => (
        <TouchableOpacity key={o.value} style={[styles.button, o.value === value && styles.selected]} onPress={() => onChange(o.value)}>
          <Text style={[styles.text, o.value === value && styles.textSelected]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {flexDirection: 'row', alignSelf: 'center', backgroundColor: '#fff', borderRadius: 999, padding: 4, marginTop: 14},
  button: {paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999},
  selected: {backgroundColor: colors.primary},
  text: {color: colors.body, fontWeight: '600', fontSize: 13},
  textSelected: {color: '#fff'},
});
