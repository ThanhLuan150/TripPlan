import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

export const MAX_STARS = 5;
const stars = Array.from({length: MAX_STARS}, (_, i) => i + 1);

// Read only stars: the value is rounded to the nearest whole star for the picture; the exact
// number is shown next to it by the caller.
export function StarDisplay({value, size = 16}: {value: number; size?: number}) {
  const {t} = useTranslation();
  const filled = Math.round(value);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('reviews.starsOf', {count: value})}
      style={styles.row}>
      {stars.map(n => (
        <Ionicons
          key={n}
          name={n <= filled ? 'star' : 'star-outline'}
          size={size}
          color={colors.warning}
        />
      ))}
    </View>
  );
}

// Choose 1-5 stars: one radio button per star.
export function StarInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (rating: number) => void;
  invalid?: boolean;
}) {
  const {t} = useTranslation();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('reviews.ratingLabel')}
      style={[styles.row, styles.input, invalid && styles.invalid]}>
      {stars.map(n => (
        <TouchableOpacity
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={t('reviews.star', {count: n})}
          accessibilityState={{checked: value === n}}
          hitSlop={{top: 6, bottom: 6, left: 2, right: 2}}
          onPress={() => onChange(n)}>
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={32}
            color={n <= value ? colors.warning : colors.faint}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 2},
  input: {gap: 6},
  invalid: {borderBottomWidth: 1, borderBottomColor: colors.error},
});
