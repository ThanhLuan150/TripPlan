import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius} from '../../lib/theme';

interface Props {
  savedAt: number;
  onContinue: () => void;
  onDiscard: () => void;
}

// "You have an unfinished draft. Continue editing?" with the two ways out.
export default function DraftBanner({savedAt, onContinue, onDiscard}: Props) {
  const {t, i18n} = useTranslation();
  const time = new Date(savedAt).toLocaleString(
    i18n.language === 'en' ? 'en-GB' : 'vi-VN',
  );
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>{t('drafts.found')}</Text>
      <Text style={styles.meta}>{t('drafts.savedAt', {time})}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.outline]}
          onPress={onDiscard}>
          <Text style={styles.outlineText}>{t('drafts.startNew')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={onContinue}>
          <Text style={styles.buttonText}>{t('drafts.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  title: {color: '#78350F', fontWeight: '700'},
  meta: {color: '#B45309', fontSize: 12},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8},
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  outline: {backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary},
  outlineText: {color: colors.primaryDark, fontWeight: '600'},
});
