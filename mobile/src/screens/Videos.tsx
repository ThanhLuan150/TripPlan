import {useTranslation} from 'react-i18next';
import {FlatList, Linking, StyleSheet, TouchableOpacity, View} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {BackHeader} from '../components';
import {homeVideos} from '../lib/homeVideos';
import {colors, radius, shadow} from '../lib/theme';

// All short videos in a two-column grid of rounded cards; tapping one opens it on YouTube.
export default function Videos() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <BackHeader title={t('videos.title')} onBack={() => navigation.goBack()} />
      <FlatList
        numColumns={2}
        data={homeVideos}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columns}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <TouchableOpacity activeOpacity={0.9} style={[styles.card, shadow]} onPress={() => Linking.openURL(item.youtubeLink)}>
            <Video source={item.source} muted repeat resizeMode="cover" style={styles.video} />
            <View style={styles.play}>
              <Ionicons name="play" size={16} color={colors.primaryDark} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  list: {padding: 16, paddingBottom: 40},
  columns: {gap: 14, marginBottom: 14},
  card: {flex: 1, aspectRatio: 9 / 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.dark},
  video: {width: '100%', height: '100%'},
  play: {position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2},
});
