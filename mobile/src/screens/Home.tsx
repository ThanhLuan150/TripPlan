import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import HomeHeader from '../components/HomeHeader';
import HomeSlider from '../components/HomeSlider';
import ImageRail from '../components/ImageRail';
import QuickActions from '../components/QuickActions';
import RankingPreview from '../components/RankingPreview';
import SectionHeader from '../components/SectionHeader';
import VideoRail from '../components/VideoRail';
import {useHome, useNotifications, useRanking} from '../hooks/queries';
import {imageSource} from '../lib/imageSource';
import {colors} from '../lib/theme';
import {useAuth} from '../store/session';

// Pictures of the original app: shown when the admin has not published banners / suggestions.
const localBanners = [
  require('../assets/images/silder.png'),
  require('../assets/images/sliderImge.jpg'),
  require('../assets/images/sliderImage1.jpg'),
  require('../assets/images/sliderImage4.jpg'),
];
const localSuggestions = [
  require('../assets/images/imagehomepage.png'),
  require('../assets/images/hagiangImage.jpg'),
  require('../assets/images/hagiangImage1.jpg'),
  require('../assets/images/hagiangImage2.jpg'),
  require('../assets/images/imagehomepage.png'),
  require('../assets/images/imagehomepage.png'),
  require('../assets/images/imagehomepage.png'),
];

export default function Home() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const {user} = useAuth();
  const [query, setQuery] = useState('');

  const home = useHome();
  const ranks = useRanking('highest');
  const notifications = useNotifications();

  // pictures from the admin; each falls back to a bundled one if it cannot be loaded
  const remoteBanners = home.data?.banners ?? [];
  const slides = remoteBanners.length
    ? remoteBanners.map((b, i) => ({
        source: imageSource(b.imageUrl),
        fallback: localBanners[i % localBanners.length],
      }))
    : localBanners.map(source => ({source, fallback: source}));
  const suggestions = home.data?.suggestions.length
    ? home.data.suggestions
    : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      <HomeHeader
        user={user}
        query={query}
        unread={notifications.data?.length ?? 0}
        onQuery={setQuery}
        onSearch={() =>
          navigation.navigate('CreateTrip', {location: query.trim()})
        }
        onBell={() => navigation.navigate('Notifications')}
        onProfile={() => navigation.navigate('Profile')}
      />
      <HomeSlider slides={slides} />
      <QuickActions
        actions={[
          {
            label: t('home.quickChat'),
            icon: 'chatbubbles',
            color: '#0284C7',
            background: '#E0F2FE',
            onPress: () => navigation.navigate('Assistant'),
          },
          {
            label: t('home.quickPlan'),
            icon: 'airplane',
            color: colors.primaryDark,
            background: colors.tint,
            onPress: () => navigation.navigate('CreateTrip'),
          },
          {
            label: t('home.quickRanking'),
            icon: 'trophy',
            color: '#D97706',
            background: '#FEF3C7',
            onPress: () => navigation.navigate('Ranking'),
          },
        ]}
      />
      <SectionHeader
        title={t('home.videos')}
        moreText={t('common.seeMore')}
        onMore={() => navigation.navigate('Videos')}
      />
      <View style={styles.videos}>
        <VideoRail />
      </View>
      <SectionHeader title={t('home.suggestions')} />
      <View style={styles.images}>
        <ImageRail
          images={
            suggestions
              ? suggestions.map((s, i) => ({
                  source: imageSource(s.imageUrl),
                  fallback: localSuggestions[i % localSuggestions.length],
                }))
              : localSuggestions.map(source => ({source, fallback: source}))
          }
          onPick={i =>
            suggestions?.[i]?.location &&
            navigation.navigate('CreateTrip', {
              location: suggestions[i].location,
            })
          }
        />
      </View>
      <SectionHeader
        title={t('home.rankingTitle')}
        moreText={t('common.seeMore')}
        onMore={() => navigation.navigate('Ranking')}
      />
      <View style={styles.ranking}>
        <RankingPreview ranks={ranks.data ?? []} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  content: {paddingHorizontal: 16, paddingTop: 48, paddingBottom: 110},
  videos: {},
  images: {},
  ranking: {},
});
