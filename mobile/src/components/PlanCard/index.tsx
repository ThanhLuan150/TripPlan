import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Plan} from '../../api';
import {colors} from '../../lib/theme';

interface Props {
  plan: Plan;
  number: number;
  location: string;
  onChoose: () => void;
}

// One AI plan: teal-outlined card with "Kế hoạch N - place", its days and a "choose" button.
export default function PlanCard({plan, number, location, onChoose}: Props) {
  const {t} = useTranslation();
  return (
    <View style={styles.plan}>
      <Text style={styles.heading}>{`${t('trips.generate.plan', {n: number})} - ${location}`}</Text>
      {Object.values(plan).map((day, i) => (
        <View key={i} style={styles.day}>
          <Text style={styles.dayTitle}>{`${t('trips.generate.day', {n: i + 1})} - ${day.title}`}</Text>
          {day.activities?.map((a, j) => (
            <Text key={j} style={styles.activity}>{`- ${a.challenge_summary}`}</Text>
          ))}
        </View>
      ))}
      <TouchableOpacity style={styles.choose} onPress={onChoose}>
        <Text style={styles.chooseText}>{t('trips.generate.choose')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  plan: {margin: 12, marginBottom: 4, borderWidth: 1, borderColor: '#B8EFEA', backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 8, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: {width: 0, height: 3}, elevation: 3},
  heading: {color: colors.primaryDark, fontWeight: '800', fontSize: 19, marginBottom: 6, alignSelf: 'center'},
  day: {borderRadius: 14, backgroundColor: colors.surface, padding: 12},
  dayTitle: {color: colors.text, fontWeight: '700', marginBottom: 4},
  activity: {color: colors.body, marginLeft: 4, lineHeight: 20},
  choose: {backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, width: '70%', justifyContent: 'center', alignItems: 'center', marginTop: 8, alignSelf: 'center'},
  chooseText: {color: '#fff', fontWeight: '700'},
});
