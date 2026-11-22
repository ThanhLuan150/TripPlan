import * as Yup from 'yup';

// Messages are i18n keys: forms show them with t(error).
export const profileSchema = Yup.object({
  fullname: Yup.string().trim().required('profile.errors.fullname').max(100, 'profile.errors.fullnameLong'),
  email: Yup.string(),
  phone: Yup.string().required('profile.errors.phone').matches(/^\d{10}$/, 'profile.invalidPhone'),
  address: Yup.string().trim().required('profile.errors.address').max(200, 'profile.errors.addressLong'),
  image: Yup.string().required('profile.errors.image'),
});

export type ProfileFormValues = Yup.InferType<typeof profileSchema>;
