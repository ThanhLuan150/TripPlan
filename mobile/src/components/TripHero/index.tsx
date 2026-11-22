import {useTranslation} from 'react-i18next';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {formatDate} from '../../lib/date';
import {images} from '../../lib/provinceImages';
import {colors} from '../../lib/theme';

interface Props {
  location?: string;
  startDate?: string;
  endDate?: string;
  onMap: () => void;
}

// Picture of the province with a "view map" button and a dark gradient carrying the place and dates.
export default function TripHero({location, startDate, endDate, onMap}: Props) {
  const {t, i18n} = useTranslation();
  const dates = `${formatDate(startDate ?? '', i18n.language)} - ${formatDate(
    endDate ?? '',
    i18n.language,
  )}`;
  return (
    <ImageBackground
      style={styles.background}
      resizeMode="cover"
      source={{uri: images[location ?? '']}}>
      <TouchableOpacity style={styles.map} onPress={onMap}>
        <Text style={styles.mapText}>{t('trips.viewMap')}</Text>
        <Ionicons name="map" size={20} color="#fff" />
      </TouchableOpacity>
      <LinearGradient colors={['#00000000', '#000000']} style={styles.gradient}>
        <Text style={styles.heading}>{location}</Text>
        <Text style={[styles.heading, styles.light]}>{dates}</Text>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    width: '100%',
    height: 220,
    marginBottom: 16,
    justifyContent: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 24,
    overflow: 'hidden',
  },
  map: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    width: '50%',
    alignSelf: 'center',
    marginBottom: 50,
  },
  mapText: {color: '#fff', fontWeight: '700'},
  gradient: {
    height: '55%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  heading: {color: '#fff', fontWeight: '800', fontSize: 21},
  light: {fontWeight: '300', fontSize: 14},
});
