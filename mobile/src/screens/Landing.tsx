import {useTranslation} from 'react-i18next';
import {Image, ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {colors, shadowLift} from '../lib/theme';

// Entry screen: teal picture, dark fade at the bottom, "Welcome to ALOCA" and a white start button.
export default function Landing() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  return (
    <ImageBackground source={require('../assets/images/BackgroundApp.png')} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.brand}>
        <Image source={require('../assets/images/Icon.png')} style={styles.logo} />
        <Text style={styles.brandName}>ALOCA</Text>
      </View>
      <LinearGradient colors={['rgba(28,93,90,0)', 'rgba(28,93,90,0.85)']} style={styles.bottom}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('auth.landing.badge')}</Text>
        </View>
        <Text style={styles.welcome}>
          {t('auth.landing.titleLine1')} {t('auth.landing.titleLine2')}
        </Text>
        <Text style={styles.aloca}>ALOCA</Text>
        <Text style={styles.description}>{t('auth.landing.description')}</Text>
        <TouchableOpacity activeOpacity={0.9} style={[styles.start, shadowLift]} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.startText}>{t('auth.landing.start')}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.primary, justifyContent: 'space-between'},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 54, paddingHorizontal: 24},
  logo: {width: 38, height: 38, borderRadius: 11},
  brandName: {color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 3},
  bottom: {paddingHorizontal: 24, paddingTop: 80, paddingBottom: 44},
  badge: {alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14},
  badgeText: {color: '#fff', fontSize: 13, fontWeight: '600'},
  welcome: {color: '#fff', fontSize: 34, fontWeight: '600'},
  aloca: {color: '#A5F3EA', fontSize: 52, fontWeight: '800', letterSpacing: 4, marginTop: 2},
  description: {color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, marginTop: 10},
  start: {flexDirection: 'row', alignSelf: 'stretch', height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26},
  startText: {fontSize: 18, color: colors.primary, fontWeight: '700'},
});
