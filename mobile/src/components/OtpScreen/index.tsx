import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, radius, shadow} from '../../lib/theme';
import {OTP_LENGTH, otpSchema} from '../../lib/validation';
import ErrorText from '../ErrorText';
import OtpInput from '../OtpInput';

interface Props {
  // line under the title, e.g. "the code was sent to your email"
  message: string;
  submitText: string;
  loading: boolean;
  error?: string;
  onSubmit: (code: string) => void;
  onResend?: () => void;
}

// Teal screen with a white card holding the six OTP boxes (confirm account / reset password).
export default function OtpScreen({
  message,
  submitText,
  loading,
  error,
  onSubmit,
  onResend,
}: Props) {
  const {t} = useTranslation();
  const formik = useFormik({
    initialValues: {otp: Array<string>(OTP_LENGTH).fill('')},
    validationSchema: otpSchema,
    onSubmit: ({otp}) => onSubmit(otp.join('')),
  });
  const incomplete =
    !!formik.touched.otp && typeof formik.errors.otp === 'string'
      ? t(formik.errors.otp)
      : undefined;

  return (
    <ImageBackground
      source={require('../../assets/images/VerifyCodeScreen.png')}
      style={styles.container}>
      <Text style={styles.aloca}>ALOCA</Text>
      <View style={[styles.card, shadow]}>
        <Text style={styles.message}>{message}</Text>
        <OtpInput
          value={formik.values.otp}
          onChange={otp => formik.setFieldValue('otp', otp)}
        />
        <Text style={styles.hint}>{t('auth.verify.hint')}</Text>
        <ErrorText message={error || incomplete} />
        <TouchableOpacity
          style={styles.button}
          onPress={() => formik.handleSubmit()}
          disabled={loading}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>{loading ? '...' : submitText}</Text>
        </TouchableOpacity>
        {onResend && (
          <TouchableOpacity onPress={onResend}>
            <Text style={styles.resend}>{t('auth.resetCode.resend')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aloca: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 6,
    marginBottom: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: radius.lg + 4,
    padding: 22,
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 16,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {color: '#fff', fontWeight: '700', fontSize: 17},
  resend: {marginTop: 16, color: colors.primaryDark, fontWeight: '700'},
});
