import * as Yup from 'yup';
export const Login_validate = Yup.object().shape({
  username: Yup.string()
    .min(5, 'Tên đăng nhập phải có ít nhất 5 ký tự!')
    .max(12, 'Tên đăng nhập tối đa 20 ký tự!')
    .required('Nhập tên đăng nhập'),
  password: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!')
    .max(20, 'Mật khẩu tối đa 20 ký tự!')
    .required('Nhập Mật Khẩu'),
});
