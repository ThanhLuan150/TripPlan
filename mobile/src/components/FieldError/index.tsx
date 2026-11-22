import {StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

// The error line under a form control, the same in every form: a red alert icon
// and the message. (The control itself gets a red border.)
export default function FieldError({message}: {message?: string | false}) {
  if (!message) {return null;}
  return (
    <View style={styles.row} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={15} color={colors.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginLeft: 2,
  },
  text: {
    flexShrink: 1,
    color: colors.error,
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 5,
  },
});
