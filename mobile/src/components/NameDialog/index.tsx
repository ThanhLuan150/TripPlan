import {useTranslation} from 'react-i18next';
import {StyleSheet, TextInput} from 'react-native';
import {colors} from '../../lib/theme';
import ConfirmModal from '../ConfirmModal';

interface Props {
  visible: boolean;
  value: string;
  onChange: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

// "Name your plan" popup.
export default function NameDialog({visible, value, onChange, onCancel, onConfirm}: Props) {
  const {t} = useTranslation();
  return (
    <ConfirmModal visible={visible} title={t('trips.generate.nameTitle')} onCancel={onCancel} onConfirm={onConfirm}>
      <TextInput value={value} onChangeText={onChange} maxLength={35} autoFocus style={styles.input} />
    </ConfirmModal>
  );
}

const styles = StyleSheet.create({
  input: {height: 46, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 12, paddingLeft: 14, color: colors.text},
});
