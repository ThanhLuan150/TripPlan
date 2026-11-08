import {ChangeEvent, FormEvent, useEffect, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCamera} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Page from '@/components/layout/Page';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import {getUser, updateUser} from '@/features/auth/store/session';
import {ProfileUpdate, profileApi} from '../api/profileApi';

export default function EditProfilePage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  // URL shown in the avatar: the saved image or a local preview of a new file
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setEmail(user.email ?? '');
      setFullname(user.fullname ?? '');
      setAddress(user.address ?? '');
      setPhone(user.phone !== undefined && user.phone !== null ? user.phone.toString() : '');
      if (user.image) {
        setImage(user.image);
      }
    }
  }, []);

  // free the local preview URL when it is replaced
  useEffect(() => {
    return () => {
      if (image?.startsWith('blob:')) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  const update = useMutation({mutationFn: profileApi.update});

  const fail = (key: string) =>
    Toast.show({type: 'error', text1: t('common.failed'), text2: t(key)});

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullname || !phone || !address || !image) {
      fail('profile.missingInfo');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      fail('profile.invalidPhone');
      return;
    }
    setSaving(true);
    try {
      const url = imageFile ? await uploadImage(imageFile) : image;
      const data: ProfileUpdate = {fullname, email, phone, address, image: url};
      await update.mutateAsync(data);
      updateUser({...data});
      queryClient.invalidateQueries({queryKey: ['profile']});
      Toast.show({type: 'success', text1: t('common.success'), text2: t('profile.saved')});
      navigate(routes.Profile);
    } catch (error) {
      console.log(error);
      fail(uploadErrorKey(error) ?? connectionErrorKey(error) ?? 'profile.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setImageFile(file);
    setImage(URL.createObjectURL(file));
    e.target.value = '';
  };

  return (
    <Page title={t('profile.editTitle')}>
      <form className="card space-y-5 p-5 md:p-7" onSubmit={handleSave}>
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
          <span className="text-xs text-slate-500">{t('profile.changePhoto')}</span>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} />
        </div>

        <Field label={t('profile.fullname')} htmlFor="fullname">
          <input
            id="fullname"
            className="field"
            value={fullname}
            onChange={e => setFullname(e.target.value)}
          />
        </Field>
        <Field label={t('profile.email')} htmlFor="email">
          <input id="email" className="field" value={email} readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('profile.phone')} htmlFor="phone">
            <input
              id="phone"
              className="field"
              value={phone}
              inputMode="numeric"
              placeholder={t('profile.phonePlaceholder')}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label={t('profile.address')} htmlFor="address">
            <input
              id="address"
              className="field"
              value={address}
              onChange={e => setAddress(e.target.value)}
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
