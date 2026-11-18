import {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, shadow} from '../../lib/theme';

interface Props {
  visible: boolean;
  title: string;
  confirmText?: string;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

// Rounded white card over a dimmed backdrop: title, content, "Hủy" / "Xác nhận".
export default function ConfirmModal({visible, title, confirmText, children, onCancel, onConfirm}: Props) {
  const {t} = useTranslation();
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={styles.backdrop} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, shadow]}>
          <Text style={styles.title}>{title}</Text>
          {children}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText ?? t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)'},
  center: {flex: 1, justifyContent: 'center', padding: 28},
  card: {backgroundColor: '#fff', padding: 22, borderRadius: radius.lg},
  title: {color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 14, textAlign: 'center', lineHeight: 24},
  actions: {flexDirection: 'row', gap: 10, marginTop: 6},
  button: {flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  cancel: {borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff'},
  cancelText: {color: colors.primary, fontWeight: '700'},
  confirm: {backgroundColor: colors.primary},
  confirmText: {color: '#fff', fontWeight: '700'},
});
