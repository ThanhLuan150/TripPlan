import {FlatList, Image, StyleSheet, Text, View} from 'react-native';
import {RankItem} from '../../api';
import {colors} from '../../lib/theme';
import {imageSource} from '../../lib/imageSource';

const ring = ['#FBBF24', '#CBD5E1', '#FDBA74'];

// Round pictures of the top users, each with a coloured ring and its position, on the home screen.
export default function RankingPreview({ranks}: {ranks: RankItem[]}) {
  return (
    <FlatList
      data={ranks}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item, i) => item._id ?? String(i)}
      renderItem={({item, index}) => (
        <View style={styles.item}>
          <View>
            <Image
              source={imageSource(item.image)}
              style={[
                styles.image,
                {borderColor: ring[index] ?? colors.border},
              ]}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.name}>
            {item.fullname}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {width: 72, alignItems: 'center', marginRight: 6},
  image: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    backgroundColor: colors.border,
  },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '800'},
  name: {marginTop: 6, fontSize: 12, fontWeight: '600', color: colors.body},
});
