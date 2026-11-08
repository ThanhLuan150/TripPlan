import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';
import {NewPassword_validate} from './NewPassword_validate';
import AuthShell, {Field} from './AuthShell';
import PasswordInput from './PasswordInput';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

interface NewAccount {
  password: string;
  confirmPassword: string;
}

export default function NewPassword() {
  const navigate = useNavigate();

  const mutationNewLogin = useMutation({
    mutationFn: async (data: NewAccount) => {
      try {
        const email = storage.getItem('emailResetPassword');
        const res = await api.post('/auth/reset-password/', {
          password: data.password,
          confirmPassword: data.confirmPassword,
          email,
        });
        if (res.status === 200) {
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Cập nhật mật khẩu thành công',
          });
          navigate(routes.Login);
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          Toast.show({
            type: 'error',
            text1: 'Thất bại',
            text2: 'Cần nhập chính xác thông tin',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Thất bại',
            text2: 'Cập nhật mật khẩu không thành công',
          });
        }
      }
    },
  });

  const handleNewPassword = (data: NewAccount) => {
    if (data && data.confirmPassword === data.password) {
      mutationNewLogin.mutate(data);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Mật khẩu xác thực không hợp lệ',
      });
    }
  };

  return (
    <AuthShell
      title="Đặt mật khẩu mới"
      subtitle="Mật khẩu mới cần có ít nhất 6 ký tự."
      footer={
        <>
          <p>
            Nhớ mật khẩu rồi?{' '}
            <Link
              to={routes.Login}
              className="font-semibold text-brand-600 hover:text-brand-700">
              Đăng nhập
            </Link>
          </p>
          <p>
            Chưa có tài khoản?{' '}
            <Link
              to={routes.Registration}
              className="font-semibold text-brand-600 hover:text-brand-700">
              Đăng ký
            </Link>
          </p>
        </>
      }>
      <Formik
        initialValues={{password: '', confirmPassword: ''}}
        validationSchema={NewPassword_validate}
        onSubmit={values => handleNewPassword(values)}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="Mật khẩu mới"
              htmlFor="password"
              error={touched.password && errors.password}>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <Field
              label="Xác nhận mật khẩu mới"
              htmlFor="confirmPassword"
              error={touched.confirmPassword && errors.confirmPassword}>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.confirmPassword}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={mutationNewLogin.isPending}>
              {mutationNewLogin.isPending && <Spinner size={18} color="#fff" />}
              Đổi mật khẩu
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
