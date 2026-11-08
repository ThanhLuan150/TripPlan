import * as Yup from 'yup';
export const Signup_validate = Yup.object().shape({
  username: Yup.string()
    .min(5, 'Tên phải có ít nhất 5 ký tự!')
    .max(12, 'Tên tối đa 20 ký tự!')
    .required('Nhập Tên Đăng Nhập'),
  email: Yup.string().email('Email không hợp lệ').required('Nhập Email'),
  password: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!')
    .max(20, 'Mật khẩu tối đa 12 ký tự')
    .required('Nhập Mật Khẩu'),
  confirmPassword: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!')
    .max(20, 'Mật khẩu tối đa 20 ký tự')
    .required('Nhập Xác Nhận Mật Khẩu '),
});
