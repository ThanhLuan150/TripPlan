import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';
import {IoArrowBack} from 'react-icons/io5';
import {validateSchema} from './ForgotPassword_Validate';
import AuthShell, {Field} from './AuthShell';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

interface Account {
  email: string;
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const mutationForgotpassword = useMutation({
    mutationFn: async (email: Account) => {
      try {
        const res = await api.post('/auth/forgot-password', email);
        if (res.status === 200) {
          storage.setItem('emailResetPassword', email.email);
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Mã xác thực đã được gửi đến Email của bạn',
          });
          navigate(routes.RefreshVerifyCode);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Thất bại',
          text2: 'Gửi mã thất bại',
        });
      }
    },
  });

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email bạn đã đăng ký, chúng tôi sẽ gửi mã xác thực cho bạn."
      footer={
        <Link
          to={routes.Login}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700">
          <IoArrowBack size={16} />
          Quay lại đăng nhập
        </Link>
      }>
      <Formik
        validationSchema={validateSchema}
        initialValues={{email: ''}}
        onSubmit={values => mutationForgotpassword.mutate({email: values.email})}>
        {({errors, touched, handleChange, handleBlur, values, handleSubmit}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="Email đã đăng ký"
              htmlFor="email"
              error={touched.email && errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                placeholder="ban@email.com"
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={mutationForgotpassword.isPending}>
              {mutationForgotpassword.isPending && (
                <Spinner size={18} color="#fff" />
              )}
              Gửi mã xác thực
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
