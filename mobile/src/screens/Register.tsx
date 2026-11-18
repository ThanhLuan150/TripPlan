import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {authApi} from '../api';
import {Button, ErrorText, FormInput} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';
import {AuthScreen} from '../layout';
import {colors} from '../lib/theme';
import {registerSchema} from '../lib/validation';

export default function Register() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const register = useApiMutation(authApi.register, {
    onSuccess: (_res, vars) => navigation.replace('Verify', {email: vars.email}),
  });

  return (
    <Formik
      initialValues={{email: '', username: '', password: '', confirmPassword: ''}}
      validationSchema={registerSchema}
      onSubmit={values => register.mutate(values)}>
      {({errors, touched, handleChange, handleBlur, handleSubmit, values, setFieldError}) => (
        <AuthScreen logoSize={135}>
          <FormInput
            label="EMAIL"
            icon="mail-outline"
            keyboardType="email-address"
            value={values.email}
            onChangeText={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email && errors.email && t(errors.email)}
          />
          <FormInput
            label={t('auth.login.username').toUpperCase()}
            icon="person-outline"
            value={values.username}
            onChangeText={handleChange('username')}
            onBlur={handleBlur('username')}
            error={touched.username && errors.username && t(errors.username)}
          />
          <FormInput
            label={t('auth.login.password').toUpperCase()}
            icon="lock-closed-outline"
            secureTextEntry
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password && errors.password && t(errors.password)}
          />
          <FormInput
            label={t('auth.register.confirmPassword').toUpperCase()}
            icon="shield-checkmark-outline"
            secureTextEntry
            value={values.confirmPassword}
            onChangeText={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={touched.confirmPassword && errors.confirmPassword && t(errors.confirmPassword)}
          />
          <ErrorText message={register.errorMessage} />
          <Button
            title={t('auth.register.submit')}
            loading={register.isPending}
            onPress={() => {
              if (values.password !== values.confirmPassword) return setFieldError('confirmPassword', t('auth.register.passwordMismatch'));
              handleSubmit();
            }}
          />
          <View style={styles.row}>
            <Text style={styles.text}>{t('auth.register.haveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>{t('auth.register.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </AuthScreen>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 6},
  text: {color: colors.muted},
  link: {color: colors.primary, fontWeight: '700'},
});
