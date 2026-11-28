import React from 'react';
import RootNavigator from '../src/navigation/RootNavigator';
import {makeAuth, renderApp} from './helpers/render';

// The navigators are replaced by light fakes that render the first screen of a stack and
// every tab, so what is checked is the app's own configuration: which screens exist for a
// signed-in / signed-out user and how the tabs look.
const mockNames: string[] = [];
const mockTabOptions: any[] = [];

jest.mock('@react-navigation/native-stack', () => {
  const R = require('react');
  const Screen = ({name, component}: any) => {
    mockNames.push(name);
    // the tab navigator is a private component: mount it to check its configuration
    return name === 'Tabs' ? R.createElement(component) : null;
  };
  const Navigator = ({children}: {children: any}) => R.createElement(R.Fragment, null, children);
  return {createNativeStackNavigator: () => ({Navigator, Screen})};
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const R = require('react');
  const Screen = ({name, options}: any) => {
    mockTabOptions.push({name, options});
    return null;
  };
  const Navigator = ({children, tabBar, screenOptions}: any) => {
    (global as any).__tabBar = tabBar;
    (global as any).__screenOptions = screenOptions;
    return R.createElement(R.Fragment, null, children);
  };
  return {
    createBottomTabNavigator: () => ({Navigator, Screen}),
    BottomTabBar: () => null,
  };
});

// the screens themselves are tested elsewhere
jest.mock('../src/screens/About', () => ({Benefit: () => null, WhatAloca: () => null}));
jest.mock('../src/screens/Assistant', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/CreateTrip', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/EditProfile', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/ForgotPassword', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/GenerateTrips', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Home', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Landing', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Login', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/NewPassword', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Notifications', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Preferences', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/UserProfile', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Profile', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/PublicTripDetail', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/PublicTrips', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Recommend', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Ranking', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Register', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/ResetCode', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/TripDetail', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/TripMap', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Verify', () => ({__esModule: true, default: () => null}));
jest.mock('../src/screens/Videos', () => ({__esModule: true, default: () => null}));

let mockKeyboard = false;
jest.mock('../src/hooks/useKeyboard', () => ({useKeyboardVisible: () => mockKeyboard}));

beforeEach(() => {
  mockNames.length = 0;
  mockTabOptions.length = 0;
  mockKeyboard = false;
});

describe('RootNavigator', () => {
  it('offers the sign-in screens to a signed-out visitor', () => {
    renderApp(<RootNavigator />, {auth: makeAuth({user: null})});
    expect(mockNames).toEqual(['Landing', 'Login', 'Register', 'Verify', 'ForgotPassword', 'ResetCode', 'NewPassword']);
  });

  it('offers the app to a signed-in user, with five tabs', () => {
    renderApp(<RootNavigator />);
    expect(mockNames).toEqual([
      'Tabs', 'CreateTrip', 'GenerateTrips', 'TripDetail', 'TripMap', 'Recommend', 'PublicTripDetail', 'Notifications', 'EditProfile', 'Preferences', 'UserProfile', 'Videos', 'WhatAloca', 'Benefit',
    ]);
  });
});

describe('tabs', () => {
  const mountTabs = () => renderApp(<RootNavigator />);

  it('has Home, Assistant, Explore, Ranking and Profile (in that order) with a label and an icon each', () => {
    mountTabs();
    expect(mockTabOptions.map(t => t.name)).toEqual(['Home', 'Assistant', 'Explore', 'Ranking', 'Profile']);
    mockTabOptions.forEach(({options}) => {
      expect(typeof options.tabBarLabel).toBe('string');
      expect(options.tabBarIcon({focused: true, color: '#000', size: 20})).toBeTruthy();
      expect(options.tabBarIcon({focused: false, color: '#000', size: 20})).toBeTruthy();
    });
    expect((global as any).__tabBar({})).toBeTruthy();
    expect((global as any).__screenOptions.headerShown).toBe(false);
  });

  it('hides the tab bar while the keyboard is open', () => {
    mockKeyboard = true;
    mountTabs();
    expect((global as any).__tabBar({})).toBeNull();
  });
});
