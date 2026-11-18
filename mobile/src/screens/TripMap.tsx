import {useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {WebView as RNWebView} from 'react-native-webview';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Loading} from '../components';
import {useTrip} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {getCurrentPosition} from '../lib/location';
import {colors} from '../lib/theme';

// The library's class typings clash with this project's React types, so it is used through a plain component type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebView = RNWebView as unknown as React.ComponentType<any>;

// Leaflet + OpenStreetMap inside a WebView (no API key needed); markers for every challenge, blue dot for the user.
const html = (markers: {lat: number; lng: number; name: string}[], you: string) => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map').setView([16.0583,105.7772],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
var pts=[];
${JSON.stringify(markers)}.forEach(function(m){
  L.marker([m.lat,m.lng]).addTo(map).bindPopup(m.name);
  pts.push([m.lat,m.lng]);
});
if(pts.length===1){map.setView(pts[0],14)}else if(pts.length>1){map.fitBounds(pts,{padding:[40,40]})}
var me=null;
window.setUser=function(lat,lng){
  if(me){map.removeLayer(me)}
  me=L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:3,fillColor:'#1a73e8',fillOpacity:1}).addTo(map).bindPopup(${JSON.stringify(you)});
};
</script></body></html>`;

export default function TripMap() {
  const {t} = useTranslation();
  const {id} = useRoute<any>().params as {id: string};
  const navigation = useNavigation<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const web = useRef<any>(null);
  const trip = useTrip(id);

  const markers = useMemo(
    () =>
      (trip.data?.dataTripDays ?? [])
        .flatMap(d => d.challenges)
        .map(c => ({lat: parseFloat(c.latitude ?? ''), lng: parseFloat(c.longitude ?? ''), name: c.challengeSummary}))
        .filter(m => !isNaN(m.lat) && !isNaN(m.lng)),
    [trip.data],
  );
  const source = useMemo(() => ({html: html(markers, t('trips.map.you'))}), [markers, t]);

  // asks for the location permission and shows the user on the map
  const locate = useApiMutation(async () => {
    const p = await getCurrentPosition();
    web.current?.injectJavaScript(`window.setUser(${p.latitude},${p.longitude});true;`);
  });

  if (trip.isLoading) return <Loading />;

  return (
    <View style={styles.container}>
      <WebView
        ref={web}
        style={styles.map}
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => locate.mutate()}
        startInLoadingState
        renderLoading={() => <Loading />}
      />
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{t('trips.backToPlan')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  map: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  back: {backgroundColor: colors.primary, padding: 10, borderRadius: 10, top: 12, width: '50%', alignSelf: 'center', alignItems: 'center', zIndex: 3},
  backText: {fontWeight: '500', fontSize: 16, color: '#fff'},
});
