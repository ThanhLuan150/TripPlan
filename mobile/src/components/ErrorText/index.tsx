import {StyleSheet, Text, View} from 'react-native';
import {colors, radius} from '../../lib/theme';

// Soft red box for server / network errors.
export default function ErrorText({message}: {message?: string}) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFF1F2',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  text: {
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 13,
  },
});
