import {
  FlatList,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, shadow} from '../../lib/theme';
import SafeImage from '../SafeImage';

export interface RailImage {
  source: ImageSourcePropType | undefined;
  fallback: number;
}

interface Props {
  images: RailImage[];
  onPick?: (index: number) => void;
}

// Horizontal row of rounded destination pictures ("Có thể bạn sẽ thích?").
export default function ImageRail({images, onPick}: Props) {
  return (
    <FlatList
      data={images}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, i) => String(i)}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      renderItem={({item, index}) => (
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!onPick}
          onPress={() => onPick?.(index)}
          style={[styles.card, shadow]}>
          <SafeImage
            source={item.source}
            fallback={item.fallback}
            style={styles.image}
          />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  gap: {width: 12},
  card: {
    width: 210,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.tabBar,
    marginBottom: 6,
  },
  image: {width: '100%', height: '100%'},
});
