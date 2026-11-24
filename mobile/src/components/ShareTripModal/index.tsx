import {useTranslation} from 'react-i18next';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {ShareStatus, tripsApi} from '../../api';
import {queryKeys, useShareStatus} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {errorText} from '../../lib/apiClient';
import {API_URL} from '../../lib/config';
import {colors, radius, shadow} from '../../lib/theme';

// The web page of the link; without WEB_URL on the backend the app can only point at the API host.
export const shareLink = (status: ShareStatus) =>
  status.shareUrl ?? `${API_URL}/shared/${status.shareToken}`;

interface Props {
  tripId: string;
  visible: boolean;
  onClose: () => void;
}

// Share a trip by link: turn sharing on/off, see the status, copy / send the link
// (the system share sheet has "Copy"). Only the owner can do it; the link is read only.
export default function ShareTripModal({tripId, visible, onClose}: Props) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const status = useShareStatus(tripId, visible);
  const toggle = useApiMutation(
    (on: boolean) =>
      on ? tripsApi.enableShare(tripId) : tripsApi.disableShare(tripId),
    {
      onSuccess: data => qc.setQueryData(queryKeys.tripShare(tripId), data),
      onError: e => alert.error(t('trips.shareFailed'), errorText(e)),
    },
  );
  const data = status.data;

  const sendLink = () => {
    if (data?.isShared && data.shareToken) {
      Share.share({message: shareLink(data)}).catch(() => undefined);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, shadow]}>
          <Text style={styles.title}>{t('trips.shareTitle')}</Text>

          {status.isError && (
            <Text style={styles.hint}>{t('trips.shareLoadFailed')}</Text>
          )}

          {data && (
            <>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.status}>
                    {t(data.isShared ? 'trips.shareOn' : 'trips.shareOff')}
                  </Text>
                  <Text style={styles.hint}>
                    {t(
                      data.isShared ? 'trips.shareHintOn' : 'trips.shareHintOff',
                    )}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={t('trips.shareToggle')}
                  value={data.isShared}
                  disabled={toggle.isPending}
                  onValueChange={on => toggle.mutate(on)}
                  trackColor={{true: colors.primary}}
                />
              </View>
              {data.isShared && (
                <>
                  <Text style={styles.hint}>{t('trips.shareViewOnly')}</Text>
                  <Text selectable style={styles.link}>
                    {shareLink(data)}
                  </Text>
                  <TouchableOpacity style={styles.copy} onPress={sendLink}>
                    <Text style={styles.copyText}>{t('trips.shareCopy')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  center: {flex: 1, justifyContent: 'center', padding: 28},
  card: {backgroundColor: '#fff', padding: 22, borderRadius: radius.lg, gap: 12},
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  rowText: {flex: 1},
  status: {color: colors.text, fontWeight: '700'},
  hint: {color: colors.body, fontSize: 13},
  link: {
    color: colors.body,
    fontSize: 13,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  copy: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyText: {color: '#fff', fontWeight: '700'},
  close: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {color: colors.primary, fontWeight: '700'},
});
