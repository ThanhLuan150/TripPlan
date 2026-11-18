import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {authApi} from '../api';
import {Button, ErrorText, FormInput} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';
import {AuthScreen} from '../layout';
import {colors} from '../lib/theme';
import {newPasswordSchema} from '../lib/validation';

// Step 3 of a password reset: the new password, twice.
export default function NewPassword() {
  const {t} = useTranslation();
  const {email} = useRoute<any>().params as {email: string};
  const navigation = useNavigation<any>();
  const reset = useApiMutation((v: {password: string; confirmPassword: string}) => authApi.resetPassword(email, v.password, v.confirmPassword), {
    onSuccess: () => navigation.replace('Login'),
  });

  return (
    <Formik initialValues={{password: '', confirmPassword: ''}} validationSchema={newPasswordSchema} onSubmit={values => reset.mutate(values)}>
      {({errors, touched, handleChange, handleBlur, handleSubmit, values, setFieldError}) => (
        <AuthScreen>
          <FormInput
            label={t('auth.newPassword.password').toUpperCase()}
            icon="lock-closed-outline"
            secureTextEntry
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password && errors.password && t(errors.password)}
          />
          <FormInput
            label={t('auth.newPassword.confirm').toUpperCase()}
            icon="shield-checkmark-outline"
            secureTextEntry
            value={values.confirmPassword}
            onChangeText={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={touched.confirmPassword && errors.confirmPassword && t(errors.confirmPassword)}
          />
          <ErrorText message={reset.errorMessage} />
          <Button
            title={t('auth.newPassword.submit')}
            loading={reset.isPending}
            onPress={() => {
              if (values.password !== values.confirmPassword) return setFieldError('confirmPassword', t('auth.newPassword.mismatch'));
              handleSubmit();
            }}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>{t('auth.backToLogin')}</Text>
          </TouchableOpacity>
        </AuthScreen>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  link: {color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 6},
});
