import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius} from '../../lib/theme';

interface Props {
  // first message of the open conversation (the "new chat" label while empty)
  title?: string;
  canStartNew: boolean;
  onHistory: () => void;
  onNew: () => void;
}

// Title of the open conversation with the "History" and "New chat" buttons (same as the web).
export default function ChatToolbar({
  title,
  canStartNew,
  onHistory,
  onNew,
}: Props) {
  const {t} = useTranslation();
  return (
    <View style={styles.bar}>
      <Text numberOfLines={1} style={styles.title}>
        {title ?? t('assistant.newChat')}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onHistory}>
        <Ionicons name="time-outline" size={18} color={colors.body} />
        <Text style={styles.buttonText}>{t('assistant.history')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.outline, !canStartNew && styles.disabled]}
        onPress={onNew}
        disabled={!canStartNew}>
        <Ionicons name="add" size={18} color={colors.body} />
        <Text style={styles.buttonText}>{t('assistant.newChat')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {flex: 1, color: colors.muted, fontSize: 13, fontWeight: '500'},
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  disabled: {opacity: 0.45},
  buttonText: {color: colors.body, fontSize: 12, fontWeight: '600'},
});
