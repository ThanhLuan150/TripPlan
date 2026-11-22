import {useTranslation} from 'react-i18next';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {BackHeader} from '../components';
import {colors, radius, shadow} from '../lib/theme';

// Shared frame: teal header with a back arrow and a scrolling body.
function Page({title, children}: {title: string; children: React.ReactNode}) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <BackHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

// "What is Aloca": picture, explanation and three highlights.
export function WhatAloca() {
  const {t} = useTranslation();
  const highlights = [
    {icon: 'game-controller-outline', key: 'about.highlightGame'},
    {icon: 'calculator-outline', key: 'about.highlightCost'},
    {icon: 'chatbubbles-outline', key: 'about.highlightChat'},
  ];
  return (
    <Page title={t('about.whatTitle')}>
      <View style={[styles.card, shadow]}>
        <Image
          source={require('../assets/images/hagiangImage.jpg')}
          style={styles.cover}
        />
        <View style={styles.cardBody}>
          <Text style={styles.heading}>{t('about.whatHeading')}</Text>
          <Text style={styles.paragraph}>{t('about.whatText')}</Text>
          {highlights.map(h => (
            <View key={h.key} style={styles.highlight}>
              <Ionicons name={h.icon} size={22} color={colors.primaryDark} />
              <Text style={styles.highlightText}>{t(h.key)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

// "Benefits": three cards with an icon each.
export function Benefit() {
  const {t} = useTranslation();
  const items = [
    {icon: 'calendar-outline', n: 1},
    {icon: 'options-outline', n: 2},
    {icon: 'compass-outline', n: 3},
  ];
  return (
    <Page title={t('about.benefitTitle')}>
      <Text style={styles.heading}>{t('about.benefitHeading')}</Text>
      <Text style={styles.subtitle}>{t('about.benefitSubtitle')}</Text>
      {items.map(i => (
        <View key={i.n} style={[styles.benefit, shadow]}>
          <View style={styles.benefitIcon}>
            <Ionicons name={i.icon} size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.benefitTexts}>
            <Text style={styles.benefitTitle}>
              {t(`about.benefit${i.n}Title`)}
            </Text>
            <Text style={styles.benefitText}>
              {t(`about.benefit${i.n}Text`)}
            </Text>
          </View>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  body: {padding: 16, paddingBottom: 40, gap: 12},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
  },
  cover: {width: '100%', height: 170},
  cardBody: {padding: 18, gap: 12},
  heading: {color: colors.text, fontSize: 24, fontWeight: '800'},
  subtitle: {color: colors.muted, fontSize: 14, marginBottom: 4},
  paragraph: {color: colors.body, fontSize: 15, lineHeight: 24},
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    padding: 12,
  },
  highlightText: {
    flex: 1,
    color: colors.primaryDeep,
    fontWeight: '600',
    fontSize: 14,
  },
  benefit: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTexts: {flex: 1},
  benefitTitle: {color: colors.text, fontWeight: '700', fontSize: 16},
  benefitText: {color: colors.body, fontSize: 14, lineHeight: 21, marginTop: 4},
});
