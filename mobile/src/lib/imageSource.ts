import {ImageURISource} from 'react-native';
import {API_URL} from './config';

// Addresses that only mean "the computer running the backend": on the web they work, on a phone they point to the phone itself.
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(:\d+)?(?=\/|$)/i;

// Some picture hosts (Wikimedia...) refuse the default User-Agent of an HTTP library; a browsers' or an app's own name is accepted.
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 AlocaMobile/1.0';

// Picture source for a URL saved by the backend or typed by an admin:
//  - "/files/abc" or "http://localhost:8080/files/abc" -> the backend the app talks to (API_URL)
//  - ngrok's free plan answers pictures with an HTML warning page unless this header is sent
export const imageSource = (url?: string | null): ImageURISource | undefined => {
  if (!url) return undefined;
  let uri = url.trim();
  if (uri.startsWith('/')) uri = API_URL + uri;
  else uri = uri.replace(LOCAL_HOST, API_URL);
  return {uri, headers: uri.startsWith(API_URL) ? {'ngrok-skip-browser-warning': '1'} : {'User-Agent': USER_AGENT}};
};
