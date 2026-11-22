import {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, shadow} from '../../lib/theme';

interface Props {
  value: string;
  placeholder: string;
  open: boolean;
  options: string[];
  // true: the user types to filter (provinces); false: a read-only choice (budget)
  editable?: boolean;
  // Ionicons name shown on the left
  icon?: string;
  // red border while the value is invalid
  invalid?: boolean;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onToggle: () => void;
  onPick: (option: string) => void;
}

// Outlined input with a left icon and a caret that opens a list of options below it
// (teal border while focused, red when invalid, a check on the chosen option).
export default function DropdownInput({
  value,
  placeholder,
  open,
  options,
  editable = true,
  icon,
  invalid,
  onChangeText,
  onBlur,
  onToggle,
  onPick,
}: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <View
        style={[styles.box, focus && styles.focus, invalid && styles.invalid]}>
        {!!icon && (
          <Ionicons
            name={icon}
            size={19}
            color={focus ? colors.primary : colors.faint}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={styles.input}
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocus(true);
            if (editable && !open) {onToggle();}
          }}
          onBlur={() => {
            setFocus(false);
            onBlur?.();
          }}
        />
        <TouchableOpacity
          style={styles.caret}
          onPress={onToggle}
          accessibilityRole="button">
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.faint}
          />
        </TouchableOpacity>
      </View>
      {open && options.length > 0 && (
        <View style={[styles.list, shadow]}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.option}
              onPress={() => onPick(option)}>
              <Text
                style={[
                  styles.optionText,
                  option === value && styles.optionOn,
                ]}>
                {option}
              </Text>
              {option === value && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.primaryDark}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingLeft: 12,
  },
  focus: {borderColor: colors.primary, backgroundColor: '#fff'},
  invalid: {borderColor: colors.error},
  icon: {marginRight: 8},
  input: {flex: 1, height: '100%', color: colors.text, fontSize: 15},
  caret: {
    height: 50,
    width: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {color: colors.text, fontSize: 14},
  optionOn: {color: colors.primaryDark, fontWeight: '700'},
});
