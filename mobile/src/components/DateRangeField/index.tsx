import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DatePicker from 'react-native-date-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../lib/theme';

interface Props {
  startDate: Date;
  endDate: Date;
  // red border of a date that is invalid (the message is shown by the form)
  startInvalid?: boolean;
  endInvalid?: boolean;
  onStart: (date: Date) => void;
  onEnd: (date: Date) => void;
}

const short = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}/${d.getFullYear()}`;

// Two outlined boxes ("Depart: 12/05/2026", "Return: 14/05/2026") that open a date picker.
// The picker only offers valid days; the form checks the rest.
export default function DateRangeField({
  startDate,
  endDate,
  startInvalid,
  endInvalid,
  onStart,
  onEnd,
}: Props) {
  const {t, i18n} = useTranslation();
  const [choosingStart, setChoosingStart] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <View>
      <View style={styles.row}>
        {[true, false].map(start => (
          <TouchableOpacity
            key={String(start)}
            style={[
              styles.box,
              (start ? startInvalid : endInvalid) && styles.invalid,
            ]}
            accessibilityRole="button"
            onPress={() => {
              setChoosingStart(start);
              setOpen(true);
            }}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primaryDark}
            />
            <View style={styles.texts}>
              <Text style={styles.label}>
                {start ? t('trips.startLabel') : t('trips.endLabel')}
              </Text>
              <Text style={styles.value}>
                {short(start ? startDate : endDate)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <DatePicker
        modal
        mode="date"
        open={open}
        date={choosingStart ? startDate : endDate}
        minimumDate={choosingStart ? new Date() : startDate}
        title={choosingStart ? t('trips.pickDay') : t('trips.pickEnd')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        locale={i18n.language === 'en' ? 'en' : 'vi'}
        onConfirm={date => {
          setOpen(false);
          (choosingStart ? onStart : onEnd)(date);
        }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 10},
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  invalid: {borderColor: colors.error},
  texts: {flex: 1},
  label: {fontSize: 11, color: colors.muted, fontWeight: '600'},
  value: {fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 1},
});
