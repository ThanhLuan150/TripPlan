import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  value: string;
  placeholder: string;
  open: boolean;
  options: string[];
  // true: the user types to filter (provinces); false: a read-only choice (budget)
  editable?: boolean;
  onChangeText?: (text: string) => void;
  onToggle: () => void;
  onPick: (option: string) => void;
}

// Outlined input with a caret that opens a list of options below it.
export default function DropdownInput({value, placeholder, open, options, editable = true, onChangeText, onToggle, onPick}: Props) {
  return (
    <View>
      <View style={styles.box}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={styles.input}
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          onFocus={() => editable && !open && onToggle()}
        />
        <TouchableOpacity style={styles.caret} onPress={onToggle}>
          <Ionicons name={open ? 'caret-up' : 'caret-down'} size={15} color={colors.faint} />
        </TouchableOpacity>
      </View>
      {open &&
        options.map(option => (
          <TouchableOpacity key={option} style={styles.option} onPress={() => onPick(option)}>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {height: 46, width: '100%', alignSelf: 'center', marginBottom: 6},
  input: {height: 46, width: '100%', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingLeft: 14, paddingRight: 40, color: colors.text},
  caret: {position: 'absolute', right: 0, height: 46, width: 40, justifyContent: 'center', alignItems: 'center'},
  option: {height: 42, width: '100%', alignSelf: 'center', paddingLeft: 14, justifyContent: 'center', borderColor: colors.border, borderBottomWidth: 1},
  optionText: {color: colors.text, fontSize: 14},
});
