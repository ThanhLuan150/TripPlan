import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

const keys = [
  'assistant.suggestion1',
  'assistant.suggestion2',
  'assistant.suggestion3',
  'assistant.suggestion4',
];

// Ready-made questions shown before the first message; tapping one sends it.
export default function SuggestionChips({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  const {t} = useTranslation();
  return (
    <View style={styles.wrap}>
      {keys.map(key => (
        <TouchableOpacity
          key={key}
          activeOpacity={0.85}
          style={styles.chip}
          onPress={() => onPick(t(key))}>
          <Ionicons name="sparkles" size={14} color={colors.primaryDark} />
          <Text style={styles.text}>{t(key)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#B8EFEA',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {color: colors.primaryDeep, fontSize: 13, fontWeight: '500'},
});
