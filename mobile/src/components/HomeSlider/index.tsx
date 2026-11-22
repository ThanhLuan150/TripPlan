import {ImageSourcePropType, StyleSheet, View} from 'react-native';
import Swiper from 'react-native-swiper';
import {colors, shadow} from '../../lib/theme';
import SafeImage from '../SafeImage';

export interface Slide {
  source: ImageSourcePropType | undefined;
  fallback: number;
}

// Autoplaying picture slider with white dots at the top of the home screen.
export default function HomeSlider({slides}: {slides: Slide[]}) {
  return (
    <View style={[styles.container, shadow]}>
      <Swiper
        style={styles.wrapper}
        showsButtons={false}
        autoplay
        key={slides.length}
        dotStyle={styles.dot}
        activeDotStyle={styles.activeDot}
        paginationStyle={styles.pagination}>
        {slides.map((slide, i) => (
          <SafeImage
            key={i}
            source={slide.source}
            fallback={slide.fallback}
            style={styles.image}
          />
        ))}
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    marginTop: 18,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.tabBar,
  },
  wrapper: {height: 190},
  image: {height: 190, width: '100%'},
  pagination: {bottom: 10},
  dot: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeDot: {backgroundColor: '#fff', width: 20, height: 7, borderRadius: 4},
});
