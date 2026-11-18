import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {Challenge} from '../../api';
import {colors} from '../../lib/theme';
import {imageSource} from '../../lib/imageSource';

interface Props {
  challenge: Challenge;
  busy: boolean;
  disabled: boolean;
  onAddPhoto: () => void;
  // tapping a photo that is not completed yet asks to retake it
  onRetake: () => void;
}

// A challenge: summary, scrolling place name, status and points on the left; its photo (or "Add photo") on the right.
export default function ActivityRow({challenge: c, busy, disabled, onAddPhoto, onRetake}: Props) {
  const {t} = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.text}>{c.challengeSummary}</Text>
        {!!c.location && (
          <Animatable.Text animation={{from: {translateX: 40}, to: {translateX: -40}}} duration={6000} iterationCount="infinite" direction="alternate" easing="linear" style={[styles.text, styles.light]}>
            {c.location}
          </Animatable.Text>
        )}
        <View style={styles.footer}>
          <Text style={[styles.light, c.completed ? styles.done : styles.todo]}>{c.completed ? t('trips.done') : t('trips.notDone')}</Text>
          <Text style={[styles.text, styles.light]}>
            {t('trips.score')}: {c.points}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {c.imageUrl ? (
          <TouchableOpacity disabled={c.completed} style={styles.photoButton} onPress={onRetake}>
            <Image source={imageSource(c.imageUrl)} style={styles.photo} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onAddPhoto} disabled={disabled}>
            {busy ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.add}>{t('trips.addPhoto')}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', marginVertical: 6, padding: 10, borderRadius: 12, backgroundColor: colors.surface},
  left: {flex: 2, overflow: 'hidden'},
  right: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {color: colors.text},
  light: {fontWeight: '300', color: colors.muted},
  footer: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 4},
  done: {color: colors.success, fontWeight: '700'},
  todo: {color: colors.error, fontWeight: '700'},
  photoButton: {flex: 1, width: '100%', paddingLeft: '5%'},
  photo: {flex: 1, width: '100%', minHeight: 64, borderRadius: 10},
  add: {color: '#fff', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', fontWeight: '600'},
});
