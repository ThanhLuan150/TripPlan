import {FlatList, Linking, StyleSheet, TouchableOpacity, View} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {homeVideos} from '../../lib/homeVideos';
import {colors, shadow} from '../../lib/theme';

// Muted, looping short videos in rounded cards with a play badge; tapping one opens it on YouTube.
export default function VideoRail() {
  return (
    <FlatList
      data={homeVideos}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={item => String(item.id)}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      renderItem={({item}) => (
        <TouchableOpacity activeOpacity={0.9} style={[styles.card, shadow]} onPress={() => Linking.openURL(item.youtubeLink)}>
          <Video source={item.source} muted repeat resizeMode="cover" style={styles.video} />
          <View style={styles.play}>
            <Ionicons name="play" size={14} color={colors.primaryDark} />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  gap: {width: 12},
  card: {width: 112, height: 190, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.dark, marginBottom: 6},
  video: {width: '100%', height: '100%'},
  play: {position: 'absolute', bottom: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2},
});
