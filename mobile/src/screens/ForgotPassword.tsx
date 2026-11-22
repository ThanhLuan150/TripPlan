import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {Image, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {authApi} from '../api';
import {Button, ErrorText, FormInput} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';
import {AuthScreen} from '../layout';
import {forgotPasswordSchema} from '../lib/validation';

// Step 1 of a password reset: the email the account was registered with.
export default function ForgotPassword() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const send = useApiMutation(authApi.forgotPassword, {
    onSuccess: (_res, email) => navigation.navigate('ResetCode', {email}),
  });

  return (
    <Formik
      initialValues={{email: ''}}
      validationSchema={forgotPasswordSchema}
      onSubmit={values => send.mutate(values.email.trim())}>
      {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
        <AuthScreen title={t('auth.forgot.title')}>
          <FormInput
            label={t('auth.forgot.email').toUpperCase()}
            icon="mail-outline"
            keyboardType="email-address"
            value={values.email}
            onChangeText={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email && errors.email && t(errors.email)}
          />
          <ErrorText message={send.errorMessage} />
          <Button
            title={t('common.confirm')}
            onPress={() => handleSubmit()}
            loading={send.isPending}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.back}>
            <Image source={require('../assets/images/backBlue.png')} />
          </TouchableOpacity>
        </AuthScreen>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  back: {alignSelf: 'center', marginTop: 6, padding: 6},
});
