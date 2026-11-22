import {Platform} from 'react-native';
import {API_URL as ENV_API_URL} from '@env';

// Backend URL from .env (see .env.example). Falls back to the dev machine:
// the Android emulator reaches it at 10.0.2.2.
const fallback = `http://${
  Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
}:8080`;

export const API_URL = (ENV_API_URL || fallback).replace(/\/+$/, '');
