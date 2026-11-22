import {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {imageSource} from '../lib/imageSource';
import {colors, gradient, radius, shadow, shadowLift} from '../lib/theme';
import {useAuth} from '../store/session';

// Menu line: tinted round icon, label, chevron.
function Row({
  icon,
  label,
  onPress,
  last,
}: {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </TouchableOpacity>
  );
}

export default function Profile() {
  const {t} = useTranslation();
  const {user, signOut} = useAuth();
  const navigation = useNavigation<any>();
  const name = user?.fullname || user?.username;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, shadow]}>
        <LinearGradient
          colors={gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.cover}
        />
        <View style={styles.identity}>
          {user?.image ? (
            <Image style={styles.image} source={imageSource(user.image)} />
          ) : (
            <View style={[styles.image, styles.imageEmpty]} />
          )}
          <Text style={styles.fullname}>{name}</Text>
          {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
          {typeof user?.experience === 'number' && (
            <View style={styles.points}>
              <Text style={styles.pointsText}>
                ⭐ {t('profile.points', {count: user.experience})}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.edit}
          onPress={() => navigation.navigate('EditProfile')}>
          <AntDesign name="form" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.shortcuts}>
        <TouchableOpacity
          style={[styles.shortcut, shadow]}
          onPress={() => navigation.navigate('Notifications')}>
          <View style={[styles.shortcutIcon, {backgroundColor: '#E0F2FE'}]}>
            <Ionicons name="notifications-outline" size={24} color="#0284C7" />
          </View>
          <Text style={styles.shortcutText}>{t('profile.notifications')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shortcut, shadow]}
          onPress={() => navigation.navigate('Tabs', {screen: 'Assistant'})}>
          <View style={[styles.shortcutIcon, {backgroundColor: colors.tint}]}>
            <Ionicons
              name="airplane-outline"
              size={24}
              color={colors.primaryDark}
            />
          </View>
          <Text style={styles.shortcutText}>{t('profile.plans')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, shadow]}>
        <Row
          icon={
            <Image
              source={require('../assets/images/Vector.png')}
              style={styles.vector}
              resizeMode="contain"
            />
          }
          label={t('profile.whatIs')}
          onPress={() => navigation.navigate('WhatAloca')}
          last
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.genz, shadow]}
        onPress={() => navigation.navigate('Benefit')}>
        <View style={styles.genzTexts}>
          <Text style={styles.genzTitle}>{t('profile.genzTitle')}</Text>
          <Text style={styles.genzText}>{t('profile.genzText')}</Text>
          <Text style={styles.pill}>{t('profile.benefits')}</Text>
        </View>
        <Image
          style={styles.genzImage}
          source={require('../assets/images/Genz.png')}
        />
      </TouchableOpacity>

      <View style={[styles.card, shadow]}>
        <Row
          icon={
            <AntDesign
              name="customerservice"
              size={20}
              color={colors.primaryDark}
            />
          }
          label={t('profile.hotline')}
          onPress={() => Linking.openURL('tel:19001009')}
        />
        <Row
          icon={
            <AntDesign name="unlock" size={20} color={colors.primaryDark} />
          }
          label={t('profile.privacy')}
        />
        <Row
          icon={
            <AntDesign name="export2" size={20} color={colors.primaryDark} />
          }
          label={t('profile.feedback')}
          last
        />
      </View>

      <View style={styles.rate}>
        <View style={styles.rateTexts}>
          <Text style={styles.rateTitle}>{t('profile.rateTitle')}</Text>
          <Text style={styles.rateText}>{t('profile.rateText')}</Text>
          <Text style={[styles.pill, shadowLift]}>{t('profile.rate')}</Text>
        </View>
        <Image
          source={require('../assets/images/user.png')}
          style={styles.rateImage}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {paddingHorizontal: 16, paddingTop: 48, paddingBottom: 110, gap: 14},
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
  },
  imageEmpty: {backgroundColor: colors.border},
  fullname: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  email: {color: colors.muted, fontSize: 14, marginTop: 2},
  points: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pointsText: {color: '#B45309', fontSize: 12, fontWeight: '700'},
  edit: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcuts: {flexDirection: 'row', gap: 12},
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 14,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {flex: 1, color: colors.text, fontWeight: '700', fontSize: 15},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  rowDivider: {borderBottomWidth: 1, borderBottomColor: colors.border},
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {flex: 1, color: colors.text, fontSize: 15, fontWeight: '500'},
  vector: {width: 20, height: 20},
  genz: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    borderRadius: radius.lg,
    padding: 18,
    gap: 12,
  },
  genzTexts: {flex: 1},
  genzTitle: {color: colors.text, fontSize: 16, fontWeight: '800'},
  genzText: {color: colors.body, fontSize: 13, marginTop: 2},
  genzImage: {width: 72, height: 72, borderRadius: 36},
  pill: {
    alignSelf: 'flex-start',
    color: '#fff',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    fontWeight: '700',
    marginTop: 10,
    overflow: 'hidden',
  },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: radius.lg,
    padding: 18,
    gap: 8,
  },
  rateTexts: {flex: 1},
  rateTitle: {color: colors.text, fontWeight: '800', fontSize: 18},
  rateText: {color: colors.body, fontSize: 13, marginTop: 2},
  rateImage: {width: 96, height: 96},
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  logoutText: {color: colors.error, fontWeight: '700', fontSize: 15},
});
