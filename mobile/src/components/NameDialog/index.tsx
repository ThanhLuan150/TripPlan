import {useTranslation} from 'react-i18next';
import {StyleSheet, TextInput} from 'react-native';
import {colors} from '../../lib/theme';
import {MAX_PLAN_NAME} from '../../lib/validation';
import ConfirmModal from '../ConfirmModal';
import FieldError from '../FieldError';

interface Props {
  visible: boolean;
  value: string;
  error?: string;
  onChange: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

// "Name your plan" popup.
export default function NameDialog({
  visible,
  value,
  error,
  onChange,
  onCancel,
  onConfirm,
}: Props) {
  const {t} = useTranslation();
  return (
    <ConfirmModal
      visible={visible}
      title={t('trips.generate.nameTitle')}
      onCancel={onCancel}
      onConfirm={onConfirm}>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={MAX_PLAN_NAME}
        autoFocus
        style={[styles.input, !!error && styles.invalid]}
      />
      <FieldError message={error} />
    </ConfirmModal>
  );
}

const styles = StyleSheet.create({
  invalid: {borderColor: colors.error},
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    paddingLeft: 14,
    color: colors.text,
  },
});
