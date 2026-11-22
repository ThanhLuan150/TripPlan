import {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';
import FieldError from '../FieldError';

interface Props {
  // Ionicons name shown in the teal badge
  icon: string;
  title: string;
  hint?: string;
  error?: string | false;
  children?: ReactNode;
}

// A titled block of a form: icon + title (+ hint), the control and its error under it.
export default function FieldSection({
  icon,
  title,
  hint,
  error,
  children,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {children}
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginTop: 16},
  head: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E8FAF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {fontSize: 15, fontWeight: '700', color: colors.text},
  hint: {fontSize: 12, color: colors.faint, marginLeft: 8, flexShrink: 1},
});
