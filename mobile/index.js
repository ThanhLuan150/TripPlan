/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {applyFonts} from './src/lib/fonts';
import {name as appName} from './app.json';

applyFonts();
AppRegistry.registerComponent(appName, () => App);
