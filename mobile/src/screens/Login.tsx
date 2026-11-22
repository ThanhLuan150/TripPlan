import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {authApi} from '../api';
import {Button, ErrorText, FormInput} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';
import {AuthScreen} from '../layout';
import {colors} from '../lib/theme';
import {loginSchema} from '../lib/validation';
import {useAuth} from '../store/session';

export default function Login() {
  const {t} = useTranslation();
  const {signIn} = useAuth();
  const navigation = useNavigation<any>();
  const login = useApiMutation(authApi.login, {onSuccess: signIn});

  return (
    <Formik
      initialValues={{username: '', password: ''}}
      validationSchema={loginSchema}
      onSubmit={values => login.mutate(values)}>
      {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
        <AuthScreen>
          <FormInput
            label={t('auth.login.username').toUpperCase()}
            icon="person-outline"
            placeholder={t('auth.login.usernamePlaceholder')}
            value={values.username}
            onChangeText={handleChange('username')}
            onBlur={handleBlur('username')}
            error={touched.username && errors.username && t(errors.username)}
          />
          <FormInput
            label={t('auth.login.password').toUpperCase()}
            icon="lock-closed-outline"
            placeholder={t('auth.login.passwordPlaceholder')}
            secureTextEntry
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password && errors.password && t(errors.password)}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgot}>
            <Text style={styles.link}>{t('auth.login.forgot')}</Text>
          </TouchableOpacity>
          <ErrorText message={login.errorMessage} />
          <Button
            title={t('auth.login.submit')}
            onPress={() => handleSubmit()}
            loading={login.isPending}
          />
          <View style={styles.row}>
            <Text style={styles.text}>{t('auth.login.noAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>{t('auth.login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </AuthScreen>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  forgot: {alignSelf: 'flex-end', marginBottom: 6},
  text: {color: colors.muted},
  link: {color: colors.primary, fontWeight: '700'},
});
