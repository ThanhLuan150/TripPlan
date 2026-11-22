import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius, shadow} from '../../lib/theme';

export interface QuickAction {
  label: string;
  icon: string;
  // icon colour and its pale background
  color: string;
  background: string;
  onPress: () => void;
}

// Three shortcut cards under the slider: ask the AI, plan a trip, open the ranking.
export default function QuickActions({actions}: {actions: QuickAction[]}) {
  return (
    <View style={styles.row}>
      {actions.map(a => (
        <TouchableOpacity
          key={a.label}
          activeOpacity={0.85}
          style={[styles.card, shadow]}
          onPress={a.onPress}>
          <View style={[styles.icon, {backgroundColor: a.background}]}>
            <Ionicons name={a.icon} size={24} color={a.color} />
          </View>
          <Text numberOfLines={2} style={styles.label}>
            {a.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 12, marginTop: 18},
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
