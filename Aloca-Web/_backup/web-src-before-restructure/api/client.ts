import axios from 'axios';
import {API_URL} from '../Helper/ip';
import {getAccessToken} from '../Helper/storage';

// Shared axios instance. Adds `Authorization: Bearer <token>` when the user is
// logged in, the same header the mobile screens set by hand.
export const api = axios.create({baseURL: API_URL});

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
