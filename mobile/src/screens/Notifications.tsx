import {useTranslation} from 'react-i18next';
import {FlatList, Image, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {BackHeader, Loading} from '../components';
import EmptyState from '../components/EmptyState';
import {useNotifications} from '../hooks/queries';
import {colors, radius, shadow} from '../lib/theme';

export default function Notifications() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const list = useNotifications();

  return (
    <View style={styles.container}>
      <BackHeader
        title={t('profile.notificationsTitle')}
        onBack={() => navigation.goBack()}
      />
      {list.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={list.data ?? []}
          showsVerticalScrollIndicator={false}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              text={
                list.isError
                  ? t('profile.notificationsFailed')
                  : t('profile.noNotifications')
              }
            />
          }
          renderItem={({item}) => (
            <View style={[styles.card, shadow]}>
              <Image
                source={require('../assets/images/Genz.png')}
                style={styles.image}
              />
              <View style={styles.texts}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.message}</Text>
                {!!item.publishAt && (
                  <Text style={styles.time}>
                    {new Date(item.publishAt).toLocaleString(
                      i18n.language === 'en' ? 'en-GB' : 'vi-VN',
                    )}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  list: {padding: 16, paddingBottom: 40, gap: 12},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 14,
  },
  image: {width: 52, height: 52, borderRadius: 26},
  texts: {flex: 1},
  title: {color: colors.text, fontSize: 16, fontWeight: '700'},
  description: {color: colors.body, fontSize: 14, marginTop: 2, lineHeight: 20},
  time: {color: colors.faint, fontSize: 11, marginTop: 6},
});
