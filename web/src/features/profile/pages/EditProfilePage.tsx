import {ChangeEvent, useEffect, useRef, useState} from 'react';
import FieldError from '@/components/ui/FieldError';
import {useFormik} from 'formik';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCamera, IoCloudUpload} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Page from '@/components/layout/Page';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import {getUser, updateUser} from '@/features/auth/store/session';
import {ProfileUpdate, profileApi} from '../api/profileApi';
import {profileSchema, type ProfileFormValues} from '../validation';

// the signed-in user's details, as the text of the fields
const initialProfile = (): ProfileFormValues => {
  const user = getUser();
  return {
    fullname: user?.fullname ?? '',
    email: user?.email ?? '',
    phone: user?.phone !== undefined && user.phone !== null ? user.phone.toString() : '',
    address: user?.address ?? '',
    image: user?.image ?? '',
  };
};

export default function EditProfilePage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  // new photo to upload (the form holds the URL shown in the avatar: the saved
  // image or a local preview of this file)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const update = useMutation({mutationFn: profileApi.update});

  const formik = useFormik<ProfileFormValues>({
    initialValues: initialProfile(),
    validationSchema: profileSchema,
    onSubmit: async values => {
      const fullname = values.fullname.trim();
      const address = values.address.trim();
      setSaving(true);
      try {
        const url = imageFile ? await uploadImage(imageFile) : values.image;
        const data: ProfileUpdate = {fullname, email: values.email, phone: values.phone, address, image: url};
        await update.mutateAsync(data);
        updateUser({...data});
        queryClient.invalidateQueries({queryKey: ['profile']});
        Toast.show({type: 'success', text1: t('common.success'), text2: t('profile.saved')});
        navigate(routes.Profile);
      } catch (error) {
        console.log(error);
        Toast.show({
          type: 'error',
          text1: t('common.failed'),
          text2: t(uploadErrorKey(error) ?? connectionErrorKey(error) ?? 'profile.saveFailed'),
        });
      } finally {
        setSaving(false);
      }
    },
  });
  const {values} = formik;
  const image = values.image || null;
  const shown = (field: keyof ProfileFormValues) => {
    const message = fieldError(formik, field);
    return message ? t(message) : undefined;
  };

  // free the local preview URL when it is replaced
  useEffect(() => {
    return () => {
      if (image?.startsWith('blob:')) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setImageFile(file);
    formik.setFieldValue('image', URL.createObjectURL(file));
    e.target.value = '';
  };

  return (
    <Page title={t('profile.editTitle')}>
      <form className="card space-y-5 p-5 md:p-7" onSubmit={formik.handleSubmit} noValidate>
        <div className="flex flex-col items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={t('profile.choosePhoto')}
            className="group relative size-28 rounded-full">
            {image ? (
              <img src={image} alt="" className="size-28 rounded-full object-cover ring-4 ring-brand-50" />
            ) : (
              <span className="block size-28 rounded-full bg-slate-200" />
            )}
            <span className="absolute right-0 bottom-0 grid size-9 place-items-center rounded-full bg-brand-500 text-white ring-4 ring-white transition group-hover:bg-brand-600">
              <IoCamera size={18} />
            </span>
          </button>
          <button type="button" className="btn btn-outline h-10 gap-2 px-4 text-sm" onClick={() => fileInput.current?.click()}>
            <IoCloudUpload size={18} />
            {t('profile.uploadPhoto')}
          </button>
          <FieldError role="alert" className="mt-0">
            {shown('image')}
          </FieldError>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} />
        </div>

        <Field label={t('profile.fullname')} htmlFor="fullname" error={shown('fullname')}>
          <input
            id="fullname"
            name="fullname"
            className="field"
            value={values.fullname}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </Field>
        <Field label={t('profile.email')} htmlFor="email">
          <input id="email" className="field" value={values.email} readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('profile.phone')} htmlFor="phone" error={shown('phone')}>
            <input
              id="phone"
              name="phone"
              className="field"
              value={values.phone}
              inputMode="numeric"
              placeholder={t('profile.phonePlaceholder')}
              onChange={e => formik.setFieldValue('phone', e.target.value.replace(/\D/g, ''))}
              onBlur={formik.handleBlur}
            />
          </Field>
          <Field label={t('profile.address')} htmlFor="address" error={shown('address')}>
            <input
              id="address"
              name="address"
              className="field"
              value={values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </Field>
        </div>

        <button type="submit" className="btn btn-primary h-12 w-full text-base" disabled={saving}>
          {saving && <Spinner size={18} color="#fff" />}
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </form>
    </Page>
  );
}
