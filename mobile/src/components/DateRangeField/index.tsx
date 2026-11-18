import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DatePicker from 'react-native-date-picker';
import {alert} from '../../lib/alert';
import {colors} from '../../lib/theme';

interface Props {
  startDate: Date;
  endDate: Date;
  onStart: (date: Date) => void;
  onEnd: (date: Date) => void;
}

const short = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

// Two teal buttons ("Depart: 12/05", "Return: 14/05") that open a date picker.
export default function DateRangeField({startDate, endDate, onStart, onEnd}: Props) {
  const {t, i18n} = useTranslation();
  const [choosingStart, setChoosingStart] = useState(true);
  const [open, setOpen] = useState(false);
  const fail = (text: string) => alert.error(t('common.failed'), text);

  const pick = (date: Date) => {
    if (choosingStart) {
      const now = new Date();
      if (new Date(date.getTime() + 24 * 60 * 60 * 1000) < now) return fail(t('trips.create.errorPastDate'));
      if (date.getDate() === now.getDate() && now.getHours() >= 18) return fail(t('trips.create.errorTooLate'));
      onStart(date);
    } else if (date >= startDate) {
      onEnd(date);
    } else {
      fail(t('trips.create.errorEndBeforeStart'));
    }
  };

  return (
    <View>
      <View style={styles.row}>
        {[true, false].map(start => (
          <TouchableOpacity
            key={String(start)}
            style={styles.button}
            onPress={() => {
              setChoosingStart(start);
              setOpen(true);
            }}>
            <Text style={styles.text}>
              {start ? t('trips.startLabel') : t('trips.endLabel')}: {short(start ? startDate : endDate)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <DatePicker
        modal
        mode="date"
        open={open}
        date={choosingStart ? startDate : endDate}
        title={choosingStart ? t('trips.pickDay') : t('trips.pickEnd')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        locale={i18n.language === 'en' ? 'en' : 'vi'}
        onConfirm={date => {
          setOpen(false);
          pick(date);
        }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, gap: 10},
  button: {flex: 1, backgroundColor: colors.primary, paddingVertical: 11, borderRadius: 12, alignItems: 'center'},
  text: {color: '#fff', fontWeight: '600'},
});
