import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ImageBackground, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, radius, shadow} from '../../lib/theme';
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
export default function OtpScreen({message, submitText, loading, error, onSubmit, onResend}: Props) {
  const {t} = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const code = digits.join('');

  return (
    <ImageBackground source={require('../../assets/images/VerifyCodeScreen.png')} style={styles.container}>
      <Text style={styles.aloca}>ALOCA</Text>
      <View style={[styles.card, shadow]}>
        <Text style={styles.message}>{message}</Text>
        <OtpInput value={digits} onChange={setDigits} />
        <Text style={styles.hint}>{t('auth.verify.hint')}</Text>
        <ErrorText message={error || (code.length > 0 && code.length < 6 ? t('auth.verify.incomplete') : undefined)} />
        <TouchableOpacity style={styles.button} onPress={() => onSubmit(code)} disabled={loading} activeOpacity={0.85}>
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
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  aloca: {fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 6, marginBottom: 20},
  card: {width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: radius.lg + 4, padding: 22, alignItems: 'center'},
  message: {textAlign: 'center', color: colors.body, fontSize: 15, lineHeight: 22},
  hint: {textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 16},
  button: {width: '100%', height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12},
  buttonText: {color: '#fff', fontWeight: '700', fontSize: 17},
  resend: {marginTop: 16, color: colors.primaryDark, fontWeight: '700'},
});
