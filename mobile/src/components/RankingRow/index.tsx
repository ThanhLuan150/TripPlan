import {useTranslation} from 'react-i18next';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {RankItem} from '../../api';
import {imageSource} from '../../lib/imageSource';

const medal = ['#FBBF24', '#CBD5E1', '#FDBA74'];

// i18n key of the title for an amount of experience
const rankTitleKey = (xp: number) => {
  if (xp < 200) {
    return 'ranking.titleRookie';
  }
  if (xp < 500) {
    return 'ranking.titleAdventurer';
  }
  if (xp < 1000) {
    return 'ranking.titleKnight';
  }
  if (xp < 2000) {
    return 'ranking.titleLegend';
  }
  return null;
};

// One line of the dark ranking list: medal-coloured position, picture, name + title pill, points.
export default function RankingRow({
  item,
  index,
  onPress,
}: {
  item: RankItem;
  index: number;
  // opens the public profile of the user
  onPress?: () => void;
}) {
  const {t} = useTranslation();
  const titleKey = rankTitleKey(item.experience);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}>
      <Text
        style={[
          styles.position,
          {color: medal[index] ?? 'rgba(255,255,255,0.6)'},
        ]}>
        {index + 1}
      </Text>
      <Image
        source={imageSource(item.image)}
        style={[styles.image, index < 3 && {borderColor: medal[index]}]}
      />
      <View style={styles.texts}>
        <Text numberOfLines={1} style={styles.fullname}>
          {item.fullname}
        </Text>
        {titleKey && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t(titleKey)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.points}>
        {t('ranking.points', {count: item.experience})}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  position: {width: 30, textAlign: 'center', fontSize: 20, fontWeight: '800'},
  image: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  texts: {flex: 1, gap: 4},
  fullname: {color: '#fff', fontSize: 15, fontWeight: '700'},
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(42,182,173,0.35)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {color: '#A5F3EA', fontSize: 11, fontWeight: '600'},
  points: {color: '#fff', fontSize: 14, fontWeight: '700'},
});
