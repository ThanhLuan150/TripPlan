import {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {TripDay} from '../../api';
import {formatDate} from '../../lib/date';
import {money} from '../../lib/text';
import {colors} from '../../lib/theme';

interface Props {
  day: TripDay;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

// A day of a saved plan: title and date; tap to open its challenges and the estimated costs.
export default function DayCard({day, open, onToggle, children}: Props) {
  const {t, i18n} = useTranslation();
  const cost = (label: string, value?: number) => <Text style={styles.text}>{`${label}: ${money(value ?? 0)} ${t('trips.estimate')}`}</Text>;
  return (
    <View style={styles.day}>
      <TouchableOpacity style={styles.header} onPress={onToggle}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>{day.title}</Text>
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.text}>{formatDate(day.date, i18n.language)}</Text>
          <Ionicons name={open ? 'caret-up' : 'caret-down'} size={20} color={colors.faint} />
        </View>
      </TouchableOpacity>
      {open && (
        <>
          {children}
          {cost(t('trips.transport'), day.transportCost)}
          {cost(t('trips.food'), day.foodCost)}
          {!!day.otherCost && cost(t('trips.other'), day.otherCost)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, backgroundColor: '#fff', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: {width: 0, height: 2}, elevation: 2},
  header: {width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  titleBox: {maxWidth: '65%'},
  title: {color: colors.text, fontWeight: '700', fontSize: 16},
  dateBox: {width: '35%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8},
  text: {color: colors.body, marginTop: 2},
});
