import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useQueryClient} from '@tanstack/react-query';
import {CommunityUser, FollowState, communityApi} from '../api';
import {BackHeader, Button, ErrorText} from '../components';
import {queryKeys, useCommunityUser} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {imageSource} from '../lib/imageSource';
import {colors, gradient, radius, shadow} from '../lib/theme';

// Public profile of another account with a Follow / Following button and the followers count.
export default function UserProfile() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const {id} = useRoute<any>().params as {id: string};
  const qc = useQueryClient();
  const query = useCommunityUser(id);
  const user = query.data;

  const apply = (state: FollowState) =>
    qc.setQueryData<CommunityUser>(
      queryKeys.communityUser(id),
      current =>
        current && {
          ...current,
          following: state.following,
          followersCount: state.followersCount,
        },
    );
  const follow = useApiMutation(() => communityApi.follow(id), {onSuccess: apply});
  const unfollow = useApiMutation(() => communityApi.unfollow(id), {onSuccess: apply});
  // your own profile is the Profile tab (with your followers), not this screen
  const isSelf = user?.isSelf;
  useEffect(() => {
    if (isSelf) {
      navigation.popToTop();
      navigation.navigate('Tabs', {screen: 'Profile'});
    }
  }, [isSelf, navigation]);
  const busy = follow.isPending || unfollow.isPending;

  return (
    <View style={styles.container}>
      <BackHeader
        title={user?.fullname ?? t('community.title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading && <Text style={styles.info}>{t('common.loading')}</Text>}
        {query.isError && (
          <View style={[styles.card, shadow]}>
            <ErrorText message={query.error ? t('community.loadFailed') : ''} />
            <TouchableOpacity onPress={() => query.refetch()}>
              <Text style={styles.retry}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && !isSelf && (
          <View style={[styles.headerCard, shadow]}>
            <LinearGradient
              colors={gradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.cover}
            />
            <View style={styles.identity}>
              <Image source={imageSource(user.image)} style={styles.image} />
              <Text style={styles.fullname}>{user.fullname}</Text>
              <View style={styles.points}>
                <Text style={styles.pointsText}>
                  ⭐ {t('profile.points', {count: user.experience})}
                </Text>
              </View>
              <View style={styles.counts}>
                <Text style={styles.count} testID="followers-count">
                  <Text style={styles.countValue}>{user.followersCount}</Text>{' '}
                  {t('community.followers')}
                </Text>
                <Text style={styles.count}>
                  <Text style={styles.countValue}>{user.followingCount}</Text>{' '}
                  {t('community.following')}
                </Text>
              </View>
              <View style={styles.action}>
                {user.following ? (
                  <Button
                    title={t('community.followingButton')}
                    variant="outline"
                    loading={busy}
                    onPress={() => unfollow.mutate()}
                  />
                ) : (
                  <Button
                    title={t('community.follow')}
                    loading={busy}
                    onPress={() => follow.mutate()}
                  />
                )}
              </View>
              <ErrorText message={follow.errorMessage || unfollow.errorMessage} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  content: {padding: 16, paddingBottom: 40},
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
  },
  cover: {height: 90},
  identity: {
    alignItems: 'center',
    marginTop: -46,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: colors.border,
  },
  fullname: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  points: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pointsText: {color: '#B45309', fontSize: 12, fontWeight: '700'},
  counts: {flexDirection: 'row', gap: 20, marginTop: 8},
  count: {color: colors.body, fontSize: 13},
  action: {alignSelf: 'stretch', marginTop: 14},
  info: {color: colors.muted, fontSize: 14},
  retry: {color: colors.primaryDark, fontWeight: '700', textAlign: 'center'},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 20,
    gap: 10,
  },
  countValue: {color: colors.text, fontWeight: '800'},
});
