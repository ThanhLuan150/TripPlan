import * as Yup from 'yup';
export const NewPassword_validate = Yup.object().shape({
  password: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!')
    .max(20, 'Mật khẩu tối đa 12 ký tự')
    .required('Nhập Mật Khẩu'),
  confirmPassword: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!')
    .max(20, 'Mật khẩu tối đa 20 ký tự')
    .required('Nhập Xác Nhận Mật Khẩu '),
});
