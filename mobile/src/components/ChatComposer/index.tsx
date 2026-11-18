import {useTranslation} from 'react-i18next';
import {ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {useKeyboardVisible} from '../../hooks/useKeyboard';
import {colors, shadow} from '../../lib/theme';

interface Props {
  value: string;
  sending: boolean;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

// Rounded message box with a round teal send button (a spinner while the answer is coming).
// It keeps room for the floating tab bar, but only while the keyboard is closed.
export default function ChatComposer({value, sending, onChangeText, onSend}: Props) {
  const {t} = useTranslation();
  const keyboard = useKeyboardVisible();
  const canSend = value !== '' && !sending;
  return (
    <View style={[styles.box, keyboard ? styles.boxKeyboard : styles.boxIdle, shadow]}>
      <TextInput
        placeholder={t('assistant.placeholder')}
        placeholderTextColor={colors.faint}
        style={styles.input}
        multiline
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity style={[styles.send, canSend ? styles.sendOn : styles.sendOff]} onPress={onSend} disabled={!canSend}>
        {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={20} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 26, borderWidth: 1, borderColor: '#B8EFEA', paddingLeft: 16, paddingRight: 6, paddingVertical: 6},
  boxIdle: {marginBottom: 100},
  boxKeyboard: {marginBottom: 8},
  input: {flex: 1, maxHeight: 96, minHeight: 40, paddingVertical: 8, fontSize: 15, color: colors.text},
  send: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 6},
  sendOn: {backgroundColor: colors.primary},
  sendOff: {backgroundColor: colors.faint},
});
