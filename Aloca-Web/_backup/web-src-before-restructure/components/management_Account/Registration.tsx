import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';
import {Signup_validate} from './SignUp_validate';
import AuthShell, {Field} from './AuthShell';
import PasswordInput from './PasswordInput';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

interface Data {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function Registration() {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (data: Data) => {
      try {
        const res = await api.post('/auth/register', data);
        if (res.status === 200) {
          storage.setItem('registeredEmail', data.email);
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Đăng ký thành công ',
          });
          navigate(routes.VerifyAccount);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Thất bại',
            text2: 'Đăng ký không thành công ',
          });
        }
      } catch (e) {
        console.log('error', e);
        Toast.show({
          type: 'error',
          text1: 'Thất bại',
          text2: 'Tài khoản này đã tồn tại',
        });
      }
    },
  });

  const handleSignUp = (data: Data) => {
    if (data && data.confirmPassword === data.password) {
      mutation.mutate(data);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng kiểm tra lại mật khẩu',
      });
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Chỉ mất chưa đầy một phút để bắt đầu"
      footer={
        <p>
          Đã có tài khoản?{' '}
          <Link
            to={routes.Login}
            className="font-semibold text-brand-600 hover:text-brand-700">
            Đăng nhập
          </Link>
        </p>
      }>
      <Formik
        initialValues={{
          email: '',
          password: '',
          confirmPassword: '',
          username: '',
        }}
        validationSchema={Signup_validate}
        onSubmit={values => handleSignUp(values)}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="Email"
              htmlFor="email"
              error={touched.email && errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                placeholder="ban@email.com"
                autoComplete="email"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.email}
              />
            </Field>
            <Field
              label="Tên đăng nhập"
              htmlFor="username"
              error={touched.username && errors.username}>
              <input
                id="username"
                name="username"
                className="field"
                placeholder="5–12 ký tự"
                autoComplete="username"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.username}
              />
            </Field>
            <Field
              label="Mật khẩu"
              htmlFor="password"
              error={touched.password && errors.password}>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <Field
              label="Xác nhận mật khẩu"
              htmlFor="confirmPassword"
              error={touched.confirmPassword && errors.confirmPassword}>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.confirmPassword}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={mutation.isPending}>
              {mutation.isPending && <Spinner size={18} color="#fff" />}
              Đăng ký
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
