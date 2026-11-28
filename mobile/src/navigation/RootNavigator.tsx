import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {
  BottomTabBar,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {GenerateParams} from '../api';
import {useKeyboardVisible} from '../hooks/useKeyboard';
import {colors} from '../lib/theme';
import {useAuth} from '../store/session';
import {Benefit, WhatAloca} from '../screens/About';
import Assistant from '../screens/Assistant';
import CreateTrip from '../screens/CreateTrip';
import EditProfile from '../screens/EditProfile';
import ForgotPassword from '../screens/ForgotPassword';
import GenerateTrips from '../screens/GenerateTrips';
import Home from '../screens/Home';
import Landing from '../screens/Landing';
import Login from '../screens/Login';
import NewPassword from '../screens/NewPassword';
import Notifications from '../screens/Notifications';
import Preferences from '../screens/Preferences';
import UserProfile from '../screens/UserProfile';
import Profile from '../screens/Profile';
import Ranking from '../screens/Ranking';
import Register from '../screens/Register';
import ResetCode from '../screens/ResetCode';
import TripDetail from '../screens/TripDetail';
import TripMap from '../screens/TripMap';
import PublicTrips from '../screens/PublicTrips';
import PublicTripDetail from '../screens/PublicTripDetail';
import SavedPosts from '../screens/SavedPosts';
import DestinationReviews from '../screens/DestinationReviews';
import Recommend from '../screens/Recommend';
import Verify from '../screens/Verify';
import Videos from '../screens/Videos';

export type RootStackParams = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  Verify: {email: string};
  ForgotPassword: undefined;
  ResetCode: {email: string};
  NewPassword: {email: string};
  Tabs: undefined;
  CreateTrip:
    | {location?: string; days?: number; people?: number; note?: string}
    | undefined;
  GenerateTrips: {params: GenerateParams};
  TripDetail: {id: string};
  TripMap: {id: string};
  Recommend: undefined;
  PublicTripDetail: {id: string};
  SavedPosts: undefined;
  DestinationReviews: {destination: string};
  Notifications: undefined;
  EditProfile: undefined;
  Preferences: undefined;
  UserProfile: {id: string};
  Videos: undefined;
  WhatAloca: undefined;
  Benefit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator();

// Bottom tabs of the original app: light-teal bar, the active tab turns teal with white icon / text.
const tabs = [
  {
    name: 'Home',
    label: 'nav.home',
    component: Home,
    icon: (focused: boolean) => (focused ? 'home' : 'home-outline'),
  },
  {
    name: 'Assistant',
    label: 'nav.assistant',
    component: Assistant,
    icon: (focused: boolean) => (focused ? 'aliwangwang' : 'aliwangwang-o1'),
    ant: true,
  },
  {
    name: 'Explore',
    label: 'nav.explore',
    component: PublicTrips,
    icon: (focused: boolean) => (focused ? 'compass' : 'compass-outline'),
  },
  {
    name: 'Ranking',
    label: 'nav.ranking',
    component: Ranking,
    icon: (focused: boolean) => (focused ? 'podium' : 'podium-outline'),
  },
  {
    name: 'Profile',
    label: 'nav.account',
    component: Profile,
    icon: (focused: boolean) => (focused ? 'person' : 'person-outline'),
  },
];

function Tabs() {
  const {t} = useTranslation();
  // The bar floats (position: absolute) and would ride above the keyboard, so it is not rendered while the keyboard is open.
  const keyboard = useKeyboardVisible();
  return (
    <Tab.Navigator
      // not drawn at all while the keyboard is open
      tabBar={props => (keyboard ? null : <BottomTabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: '#000',
        tabBarActiveTintColor: '#fff',
        tabBarActiveBackgroundColor: colors.primary,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: false,
      }}>
      {tabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: t(tab.label),
            tabBarIcon: ({focused, color, size}) =>
              tab.ant ? (
                <AntDesign name={tab.icon(focused)} size={size} color={color} />
              ) : (
                <Ionicons name={tab.icon(focused)} size={size} color={color} />
              ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const {user} = useAuth();
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="CreateTrip" component={CreateTrip} />
          <Stack.Screen name="GenerateTrips" component={GenerateTrips} />
          <Stack.Screen name="TripDetail" component={TripDetail} />
          <Stack.Screen name="TripMap" component={TripMap} />
          <Stack.Screen name="Recommend" component={Recommend} />
          <Stack.Screen name="PublicTripDetail" component={PublicTripDetail} />
          <Stack.Screen name="SavedPosts" component={SavedPosts} />
          <Stack.Screen
            name="DestinationReviews"
            component={DestinationReviews}
          />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen name="Preferences" component={Preferences} />
          <Stack.Screen name="UserProfile" component={UserProfile} />
          <Stack.Screen name="Videos" component={Videos} />
          <Stack.Screen name="WhatAloca" component={WhatAloca} />
          <Stack.Screen name="Benefit" component={Benefit} />
        </>
      ) : (
        <>
          <Stack.Screen name="Landing" component={Landing} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Verify" component={Verify} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ResetCode" component={ResetCode} />
          <Stack.Screen name="NewPassword" component={NewPassword} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // floating light-teal bar with rounded corners; the active tab is a teal rounded block
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    paddingHorizontal: 6,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  tabItem: {borderRadius: 18, marginVertical: 7, paddingVertical: 2},
});
