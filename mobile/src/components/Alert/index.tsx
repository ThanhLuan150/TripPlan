import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AlertOptions, AlertType, subscribeAlert} from '../../lib/alert';
import {colors, radius, shadow} from '../../lib/theme';

const icons: Record<AlertType, {name: string; color: string; background: string}> = {
  success: {name: 'checkmark', color: colors.success, background: '#DCFCE7'},
  error: {name: 'close', color: colors.error, background: '#FFE4E6'},
  info: {name: 'information', color: colors.primaryDark, background: colors.tint},
  confirm: {name: 'help', color: colors.warning, background: '#FEF3C7'},
};

// Success notices close by themselves after this time.
const AUTO_CLOSE_MS = 2200;

// The app's one alert / confirm dialog: a rounded card with an icon, a title, a message and its buttons.
// Mount it once (App.tsx) and open it with `alert.success / error / info / confirm` from lib/alert.
export default function Alert() {
  const {t} = useTranslation();
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => subscribeAlert(setOptions), []);

  useEffect(() => {
    if (!options) return;
    scale.setValue(0.9);
    Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 7}).start();
    if (options.type !== 'success') return;
    const timer = setTimeout(() => setOptions(null), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [options, scale]);

  const close = () => setOptions(null);
  const confirm = () => {
    options?.onConfirm?.();
    close();
  };

  if (!options) return null;
  const icon = icons[options.type];
  const isConfirm = options.type === 'confirm';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, shadow, {transform: [{scale}]}]}>
          <View style={[styles.icon, {backgroundColor: icon.background}]}>
            <Ionicons name={icon.name} size={30} color={icon.color} />
          </View>
          <Text style={styles.title}>{options.title}</Text>
          {!!options.message && <Text style={styles.message}>{options.message}</Text>}
          <View style={styles.actions}>
            {isConfirm && (
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={close}>
                <Text style={styles.cancelText}>{options.cancelText ?? t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, options.destructive ? styles.danger : styles.confirm]} onPress={isConfirm ? confirm : close}>
              <Text style={styles.confirmText}>{options.confirmText ?? (isConfirm ? t('common.confirm') : 'OK')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)'},
  center: {flex: 1, justifyContent: 'center', padding: 28},
  card: {backgroundColor: '#fff', borderRadius: radius.lg + 4, padding: 22, alignItems: 'center'},
  icon: {width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  title: {color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 24},
  message: {color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 6},
  actions: {flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch'},
  button: {flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  cancel: {borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff'},
  cancelText: {color: colors.primary, fontWeight: '700'},
  confirm: {backgroundColor: colors.primary},
  danger: {backgroundColor: colors.error},
  confirmText: {color: '#fff', fontWeight: '700'},
});
