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
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  MAX_REPORT_LENGTH,
  REPORT_REASONS,
  ReportReason,
  tripsApi,
} from '../../api';
import {useApiMutation} from '../../hooks/useApiMutation';
import {apiMessage, apiStatus, errorText} from '../../lib/apiClient';
import {colors, radius, shadow} from '../../lib/theme';
import FieldError from '../FieldError';

interface Props {
  // the post (public trip) being reported
  tripId: string;
  visible: boolean;
  onClose: () => void;
}

// Report of a post: choose a reason, add details, send. The report is private: the author is
// never told who sent it.
export default function ReportPostModal({tripId, visible, onClose}: Props) {
  const {t} = useTranslation();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const trimmed = description.trim();
  const tooLong = trimmed.length > MAX_REPORT_LENGTH;
  // "other" says nothing about the problem without the description
  const missing = reason === 'other' && trimmed.length === 0;

  const send = useApiMutation(
    () => tripsApi.reportPost(tripId, reason, trimmed || undefined),
    {
      onSuccess: () => setSent(true),
      onError: e => {
        const status = apiStatus(e);
        setServerError(
          status === 409
            ? t('trips.reportDuplicate')
            : status === 404
              ? t('trips.reportUnavailable')
              : status === 400 && /own post/i.test(apiMessage(e) ?? '')
                ? t('trips.reportOwn')
                : status
                  ? t('trips.reportFailed')
                  : errorText(e),
        );
      },
    },
  );

  const close = () => {
    onClose();
    // the next report starts clean
    setSent(false);
    setServerError(null);
    setDescription('');
    setReason('spam');
    setShowMissing(false);
  };

  const submit = () => {
    setServerError(null);
    if (missing) {
      setShowMissing(true);
      return;
    }
    if (!tooLong) {
      send.mutate();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={close}>
      <Pressable onPress={close} style={styles.backdrop} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, shadow]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <Text style={styles.title}>{t('trips.reportTitle')}</Text>

            {sent ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={44}
                  color={colors.primary}
                  style={styles.sentIcon}
                />
                <Text style={styles.sentTitle}>{t('trips.reportSent')}</Text>
                <Text style={styles.hint}>{t('trips.reportSentText')}</Text>
                <TouchableOpacity style={styles.primary} onPress={close}>
                  <Text style={styles.primaryText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hint}>{t('trips.reportSubtitle')}</Text>
                <Text style={styles.label}>{t('trips.reportReason')}</Text>
                <View accessibilityRole="radiogroup" style={styles.reasons}>
                  {REPORT_REASONS.map(value => (
                    <TouchableOpacity
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={t(`trips.reportReasons.${value}`)}
                      accessibilityState={{checked: reason === value}}
                      style={[
                        styles.reason,
                        reason === value && styles.reasonOn,
                      ]}
                      onPress={() => {
                        setReason(value);
                        setShowMissing(false);
                      }}>
                      <Ionicons
                        name={
                          reason === value ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={20}
                        color={reason === value ? colors.primary : colors.faint}
                      />
                      <Text style={styles.reasonText}>
                        {t(`trips.reportReasons.${value}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>
                  {t(
                    reason === 'other'
                      ? 'trips.reportDescription'
                      : 'trips.reportDescriptionOptional',
                  )}
                </Text>
                <TextInput
                  multiline
                  accessibilityLabel={t('trips.reportDescription')}
                  placeholder={t('trips.reportDescriptionPlaceholder')}
                  placeholderTextColor={colors.faint}
                  value={description}
                  onChangeText={setDescription}
                  style={[
                    styles.input,
                    (tooLong || (showMissing && missing)) && styles.invalid,
                  ]}
                />
                <FieldError
                  message={
                    tooLong
                      ? t('trips.reportTooLong', {max: MAX_REPORT_LENGTH})
                      : showMissing && missing
                        ? t('trips.reportDescriptionRequired')
                        : false
                  }
                />
                <FieldError message={serverError ?? false} />

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.reportSubmit')}
                  disabled={send.isPending || tooLong}
                  style={[
                    styles.primary,
                    (send.isPending || tooLong) && styles.disabled,
                  ]}
                  onPress={submit}>
                  <Text style={styles.primaryText}>{t('trips.reportSubmit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.close} onPress={close}>
                  <Text style={styles.closeText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  center: {flex: 1, justifyContent: 'center', padding: 22},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    maxHeight: '92%',
  },
  content: {padding: 22, gap: 10},
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  hint: {color: colors.body, fontSize: 13},
  label: {color: colors.label, fontWeight: '600', fontSize: 13},
  reasons: {gap: 6},
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reasonOn: {borderColor: colors.primary, backgroundColor: colors.tint},
  reasonText: {color: colors.text, flex: 1},
  input: {
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  invalid: {borderColor: colors.error},
  sentIcon: {alignSelf: 'center'},
  sentTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  primary: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {color: '#fff', fontWeight: '700'},
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
