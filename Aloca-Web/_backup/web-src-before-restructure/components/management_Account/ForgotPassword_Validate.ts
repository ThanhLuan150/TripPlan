import * as Yup from 'yup';
export const validateSchema = Yup.object().shape({
  email: Yup.string()
    .email('Không tìm thấy email bạn đã nhập, vui lòng kiểm tra lại')
    .required('Required'),
});
