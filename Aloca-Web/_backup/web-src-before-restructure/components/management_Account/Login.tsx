import {Formik} from 'formik';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Login_validate} from './Login_validate';
import AuthShell, {Field} from './AuthShell';
import PasswordInput from './PasswordInput';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {setUser, storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

interface Account {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const mutationLogin = useMutation({
    mutationFn: async (data: Account) => {
      try {
        // No FCM token on the web (push notifications are mobile-only).
        const res = await api.post('/auth/login', data);
        if (res.status === 200) {
          const token = res.data;
          storage.multiRemove(['fcm_token', 'AccessToken', 'user']);
          storage.setItem('AccessToken', token.accessToken);
          setUser(token);
          queryClient.invalidateQueries({queryKey: ['profile']});
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Đăng nhập thành công',
          });
          const from = (location.state as {from?: {pathname: string}})?.from
            ?.pathname;
          navigate(from && from !== routes.Login ? from : routes.Home, {
            replace: true,
          });
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404 || status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Thất bại',
            text2:
              error?.response?.data?.message === 'Unverified account'
                ? 'Tài khoản chưa được xác thực'
                : 'Sai tên đăng nhập hoặc mật khẩu!!',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Thất bại',
            text2: 'Không thành công!!',
          });
        }
      }
    },
  });

  return (
    <AuthShell
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để tiếp tục hành trình cùng Aloca"
      footer={
        <p>
          Chưa có tài khoản?{' '}
          <Link
            to={routes.Registration}
            className="font-semibold text-brand-600 hover:text-brand-700">
            Đăng ký
          </Link>
        </p>
      }>
      <Formik
        initialValues={{username: '', password: ''}}
        validationSchema={Login_validate}
        onSubmit={values => {
          mutationLogin.mutate({
            username: values.username,
            password: values.password,
          });
        }}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="Tên đăng nhập"
              htmlFor="username"
              error={touched.username && errors.username}>
              <input
                id="username"
                name="username"
                className="field"
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.username}
              />
            </Field>
            <Field
              label="Mật khẩu"
              htmlFor="password"
              error={touched.password && errors.password}
              aside={
                <Link
                  to={routes.ForgotPassword}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  Quên mật khẩu?
                </Link>
              }>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={mutationLogin.isPending}>
              {mutationLogin.isPending && <Spinner size={18} color="#fff" />}
              Đăng nhập
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
