import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}

// Number box with a "-" and a "+" circle inside it (1 to 10 people).
export default function QuantityInput({value, min = 1, max = 10, onChange}: Props) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isNaN(n) ? min : n));
  return (
    <View style={styles.wrap}>
      <TextInput value={String(value)} onChangeText={text => onChange(clamp(parseInt(text, 10)))} keyboardType="numeric" style={styles.input} />
      <View style={styles.buttons}>
        <TouchableOpacity style={value === min && styles.hidden} onPress={() => onChange(clamp(value - 1))}>
          <Ionicons name="remove-circle" size={30} color={colors.faint} />
        </TouchableOpacity>
        <TouchableOpacity style={value === max && styles.hidden} onPress={() => onChange(clamp(value + 1))}>
          <Ionicons name="add-circle" size={30} color={colors.faint} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {width: '100%', alignSelf: 'center'},
  input: {height: 46, width: '100%', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 6, paddingLeft: 14, color: colors.text, fontWeight: '700'},
  buttons: {flexDirection: 'row', height: 46, alignItems: 'center', position: 'absolute', right: 8},
  hidden: {display: 'none'},
});
