import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {areaTypes} from '../../lib/areaTypes';
import {colors} from '../../lib/theme';

interface Props {
  selected: string[];
  onToggle: (value: string) => void;
}

// Two-column grid of outlined buttons; a chosen one is filled teal.
export default function AreaTypeGrid({selected, onToggle}: Props) {
  const {t} = useTranslation();
  return (
    <View style={styles.grid}>
      {areaTypes.map(a => {
        const on = selected.includes(a.value);
        return (
          <TouchableOpacity key={a.value} style={[styles.item, on && styles.itemOn]} onPress={() => onToggle(a.value)}>
            <Text style={[styles.text, on && styles.textOn]}>{t(a.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  item: {marginTop: 8, padding: 11, borderRadius: 12, backgroundColor: '#fff', borderColor: colors.border, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', width: '48.5%'},
  itemOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  text: {color: colors.text, fontSize: 13, fontWeight: '500', textAlign: 'center'},
  textOn: {color: '#fff', fontWeight: '700'},
});
