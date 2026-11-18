import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {SceneMap, TabBar, TabView} from 'react-native-tab-view';
import ChatView from '../components/ChatView';
import {colors} from '../lib/theme';
import Trips from './Trips';

const scenes = SceneMap({chat: ChatView, plans: Trips});

// Assistant tab: swipeable "Chat" / "Kế hoạch" pages under a light-teal tab bar.
export default function Assistant() {
  const {t} = useTranslation();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const routes = [
    {key: 'chat', title: t('nav.chat')},
    {key: 'plans', title: t('nav.plans')},
  ];

  return (
    <TabView
      navigationState={{index, routes}}
      renderScene={scenes}
      onIndexChange={setIndex}
      initialLayout={{width: layout.width}}
      renderTabBar={props => (
        <TabBar
          {...props}
          indicatorStyle={styles.indicator}
          style={styles.bar}
          activeColor={colors.primaryDark}
          inactiveColor={colors.muted}
          pressColor={colors.tabBar}
          options={{chat: {labelStyle: styles.label}, plans: {labelStyle: styles.label}}}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {backgroundColor: colors.primary, height: 3, borderRadius: 2},
  bar: {backgroundColor: colors.tint, paddingTop: 30, elevation: 0, shadowOpacity: 0},
  label: {fontSize: 16, fontWeight: '700', textTransform: 'none'},
});
