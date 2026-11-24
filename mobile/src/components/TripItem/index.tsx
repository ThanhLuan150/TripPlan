import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Trip} from '../../api';
import {formatDate} from '../../lib/date';
import {colors} from '../../lib/theme';

interface Props {
  trip: Trip;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  // heart button, shown only when a handler is given
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

// Teal-outlined row of a saved plan: name, place, dates and the trash icon.
export default function TripItem({trip, onOpen, onDelete, onDuplicate, favorite = false, onToggleFavorite}: Props) {
  const {i18n} = useTranslation();
  // dd/mm - dd/mm (the year is dropped so it stays on one line)
  const short = (d: string) => formatDate(d, i18n.language).slice(0, 5);
  const dates = `${short(trip.startDate)} - ${short(trip.endDate)}`;
  return (
    <TouchableOpacity style={styles.trip} onPress={onOpen}>
      <Text style={styles.name}>{trip.nameTrip}</Text>
      <View style={styles.info}>
        <View style={styles.texts}>
          <Text style={styles.text}>{trip.location}</Text>
          <Text style={styles.text}>{dates}</Text>
        </View>
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.trash}
            accessibilityRole="button"
            accessibilityState={{selected: favorite}}
            onPress={onToggleFavorite}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={favorite ? '#E11D48' : colors.primary}
            />
          </TouchableOpacity>
        )}
        {onDuplicate && (
          <TouchableOpacity style={styles.trash} onPress={onDuplicate}>
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.trash} onPress={onDelete}>
          <Ionicons name="trash" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trip: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D6F5F2',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  name: {flex: 1, color: colors.text, fontWeight: '700', fontSize: 16},
  info: {flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '55%'},
  texts: {alignItems: 'flex-end', flexShrink: 1},
  text: {color: colors.muted, fontSize: 13},
  trash: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
