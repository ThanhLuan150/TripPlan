import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {MAX_POST_LENGTH, tripsApi} from '../../api';
import {queryKeys, useTripPost} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {apiMessage, apiStatus, errorText} from '../../lib/apiClient';
import {colors, radius, shadow} from '../../lib/theme';
import ConfirmModal from '../ConfirmModal';
import FieldError from '../FieldError';

interface Props {
  tripId: string;
  visible: boolean;
  onClose: () => void;
}

// Share a plan as a post of the Travel Community: write an introduction and publish. The post IS
// the plan made public (view only), so nothing of the plan is copied. Removing the post makes the
// plan private again. Only the owner reaches this (the backend checks it).
export default function SharePostModal({tripId, visible, onClose}: Props) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const status = useTripPost(tripId, visible);
  // null: the user did not type yet, so the saved introduction is shown
  const [draft, setDraft] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const data = status.data;
  const content = draft ?? data?.content ?? '';
  const length = content.trim().length;
  const tooLong = length > MAX_POST_LENGTH;

  const refreshAround = () => {
    // the visibility badge, the share link and the public lists follow the post
    qc.invalidateQueries({queryKey: queryKeys.tripVisibility(tripId)});
    qc.invalidateQueries({queryKey: queryKeys.tripShare(tripId)});
    qc.invalidateQueries({queryKey: queryKeys.publicTrips});
  };

  const share = useApiMutation(
    () => tripsApi.sharePost(tripId, content.trim()),
    {
      onSuccess: result => {
        qc.setQueryData(queryKeys.tripPost(tripId), result);
        setDraft(null);
        refreshAround();
        alert.success(
          t('common.success'),
          t(data?.isPosted ? 'trips.postUpdatedOk' : 'trips.postSharedOk'),
        );
      },
      onError: e =>
        alert.error(
          t('common.error'),
          apiStatus(e) === 400 && /at least one day/i.test(apiMessage(e) ?? '')
            ? t('trips.postNoDays')
            : errorText(e),
        ),
    },
  );

  const remove = useApiMutation(() => tripsApi.removePost(tripId), {
    onSuccess: result => {
      qc.setQueryData(queryKeys.tripPost(tripId), result);
      setDraft(null);
      refreshAround();
      alert.success(t('common.success'), t('trips.postRemovedOk'));
    },
    onError: e => alert.error(t('trips.postRemoveFailed'), errorText(e)),
  });

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={[styles.card, shadow]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}>
              <Text style={styles.title}>{t('trips.postTitle')}</Text>
              <Text style={styles.hint}>{t('trips.postSubtitle')}</Text>

              {status.isError && (
                <Text style={styles.hint}>{t('trips.postLoadFailed')}</Text>
              )}

              {data && (
                <>
                  <Text
                    style={[styles.status, data.isPosted && styles.statusOn]}>
                    {t(data.isPosted ? 'trips.postPosted' : 'trips.postNotPosted')}
                  </Text>
                  <Text style={styles.label}>{t('trips.postContentLabel')}</Text>
                  <TextInput
                    multiline
                    accessibilityLabel={t('trips.postContentLabel')}
                    placeholder={t('trips.postContentPlaceholder')}
                    placeholderTextColor={colors.faint}
                    value={content}
                    onChangeText={setDraft}
                    style={[styles.input, tooLong && styles.invalid]}
                  />
                  <View style={styles.counterRow}>
                    <View style={styles.flex}>
                      <FieldError
                        message={
                          tooLong &&
                          t('trips.postTooLong', {max: MAX_POST_LENGTH})
                        }
                      />
                    </View>
                    <Text style={styles.counter}>
                      {t('trips.postCounter', {
                        count: length,
                        max: MAX_POST_LENGTH,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.hint}>{t('trips.postNotice')}</Text>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      data.isPosted ? 'trips.postUpdate' : 'trips.postShare',
                    )}
                    disabled={share.isPending || tooLong}
                    style={[
                      styles.primary,
                      (share.isPending || tooLong) && styles.disabled,
                    ]}
                    onPress={() => share.mutate()}>
                    <Text style={styles.primaryText}>
                      {t(data.isPosted ? 'trips.postUpdate' : 'trips.postShare')}
                    </Text>
                  </TouchableOpacity>
                  {data.isPosted && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t('trips.postRemove')}
                      disabled={remove.isPending}
                      style={[styles.danger, remove.isPending && styles.disabled]}
                      onPress={() => setRemoving(true)}>
                      <Text style={styles.dangerText}>{t('trips.postRemove')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.close} onPress={onClose}>
                <Text style={styles.closeText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal
        visible={removing}
        title={t('trips.postRemoveConfirm')}
        confirmText={t('trips.postRemove')}
        onCancel={() => setRemoving(false)}
        onConfirm={() => {
          setRemoving(false);
          remove.mutate();
        }}>
        <Text style={styles.hint}>{t('trips.postRemoveText')}</Text>
      </ConfirmModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  center: {flex: 1, justifyContent: 'center', padding: 22},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    maxHeight: '90%',
  },
  content: {padding: 22, gap: 10},
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  hint: {color: colors.body, fontSize: 13},
  status: {
    color: colors.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    fontSize: 13,
  },
  statusOn: {backgroundColor: colors.tint, color: colors.primaryDeep},
  label: {color: colors.label, fontWeight: '600', fontSize: 13},
  input: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  invalid: {borderColor: colors.error},
  counterRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  flex: {flex: 1},
  counter: {color: colors.faint, fontSize: 12, marginTop: 6},
  primary: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {color: '#fff', fontWeight: '700'},
  danger: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {color: colors.error, fontWeight: '700'},
  disabled: {opacity: 0.6},
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
