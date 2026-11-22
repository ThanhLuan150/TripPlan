import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  title: string;
  moreText?: string;
  onMore?: () => void;
}

// Bold title with a teal accent bar, and a teal "see more" link with an arrow on the right.
export default function SectionHeader({title, moreText, onMore}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBox}>
        <View style={styles.accent} />
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      {!!moreText && (
        <TouchableOpacity style={styles.more} onPress={onMore}>
          <Text style={styles.moreText}>{moreText}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  titleBox: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  accent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  title: {color: colors.text, fontSize: 18, fontWeight: '800', flexShrink: 1},
  more: {flexDirection: 'row', alignItems: 'center'},
  moreText: {color: colors.primary, fontSize: 14, fontWeight: '600'},
});
