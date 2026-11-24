jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Native / view libraries that cannot render in Jest: plain host components.
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-vector-icons/AntDesign', () => 'AntDesign');
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesome');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-video', () => 'Video');
jest.mock('react-native-webview', () => ({WebView: 'WebView'}));
jest.mock('react-native-pager-view', () => 'PagerView');
jest.mock('react-native-swiper', () => 'Swiper');
jest.mock('react-native-date-picker', () => 'DatePicker');
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign('Toast', {show: jest.fn(), hide: jest.fn()}),
}));
jest.mock('react-native-animatable', () => {
  const {View, Text, Image} = require('react-native');
  return {View, Text, Image, createAnimatableComponent: c => c};
});
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
