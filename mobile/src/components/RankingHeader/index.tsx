import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList, Image, ImageBackground, StyleSheet, Text, View} from 'react-native';
import {RankItem} from '../../api';
import {colors} from '../../lib/theme';
import {imageSource} from '../../lib/imageSource';

// Teal podium picture with the top three users on it (best one in the middle, bigger).
export default function RankingHeader({ranks}: {ranks: RankItem[]}) {
  const {t} = useTranslation();
  const topThree = useMemo(() => {
    const top = [...ranks].sort((a, b) => b.experience - a.experience).slice(0, 3);
    if (top.length >= 2) [top[0], top[1]] = [top[1], top[0]];
    return top;
  }, [ranks]);

  return (
    <View>
      <ImageBackground source={require('../../assets/images/imageRanking.png')} style={styles.background}>
        <Image source={require('../../assets/images/topRanking.png')} style={styles.podiumTop} />
        <Image source={require('../../assets/images/top3ranking.png')} style={styles.podiumLeft} />
        <Image source={require('../../assets/images/top2ranking.png')} style={styles.podiumRight} />
      </ImageBackground>
      <Text style={styles.text}>
        {t('ranking.title')}
      </Text>
      <View style={styles.top}>
        <FlatList
          data={topThree}
          horizontal
          keyExtractor={(_, i) => String(i)}
          renderItem={({item, index}) => (
            <View style={styles.item}>
              <Image source={imageSource(item.image)} style={[styles.avatar, index === 1 && styles.avatarFirst]} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {alignSelf: 'center', width: 352, height: 210},
  podiumTop: {position: 'absolute', alignSelf: 'center', bottom: 75, zIndex: 2},
  podiumLeft: {position: 'absolute', alignSelf: 'center', left: '18.5%', bottom: 60, zIndex: 2},
  podiumRight: {position: 'absolute', alignSelf: 'center', right: '18.5%', bottom: 60, zIndex: 2},
  text: {color: colors.primary, fontSize: 20, fontWeight: 'bold', textAlign: 'center'},
  top: {position: 'absolute', top: '18%', alignSelf: 'center'},
  item: {margin: 6, alignSelf: 'flex-end'},
  avatar: {width: 65, height: 65, borderRadius: 50, backgroundColor: '#fff'},
  avatarFirst: {width: 80, height: 80},
});
