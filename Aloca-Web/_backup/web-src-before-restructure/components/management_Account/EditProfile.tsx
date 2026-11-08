import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {IoCamera} from 'react-icons/io5';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import Page from '../Page';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {Field} from './AuthShell';
import {api} from '../../api/client';
import {storage as firebaseStorage} from '../../firebase/firebaseConfig';
import {getUser, setUser} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

interface ProfileUpdate {
  fullname: string;
  email?: string;
  phone: string;
  address: string;
  image: string;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  // URL shown in the avatar: the saved image or a local preview of a new file
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userData = getUser();
    if (userData) {
      setEmail(userData.data.email ?? '');
      setNewName(userData.data.fullname ?? '');
      setNewAddress(userData.data.address ?? '');
      setNewPhone(
        userData.data.phone !== undefined && userData.data.phone !== null
          ? userData.data.phone.toString()
          : '',
      );
      if (userData.data.image) {
        setSelectedImage(userData.data.image);
      }
    }
  }, []);

  // free the local preview URL when it is replaced
  useEffect(() => {
    return () => {
      if (selectedImage?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const mutationEdit = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await api.post('/user/profile', data);
      return response;
    },
    onSuccess: response => {
      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Thành công',
          text2: 'Cập nhật thông tin thành công',
        });
      }
    },
    onError: error => {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Cập nhật thông tin không thành công!',
      });
    },
  });

  const handleSaveProfile = async () => {
    if (!newName || !newPhone || !newAddress || !selectedImage) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng nhập đầy đủ thông tin',
      });
      return;
    }
    if (!/^\d{10}$/.test(newPhone)) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Số điện thoại không hợp lệ ',
      });
      return;
    }
    setSaving(true);
    try {
      let url = selectedImage;
      if (imageFile) {
        const fileRef = ref(firebaseStorage, `${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile, {contentType: imageFile.type});
        url = await getDownloadURL(fileRef);
      }
      const data: ProfileUpdate = {
        fullname: newName,
        email,
        phone: newPhone,
        address: newAddress,
        image: url,
      };
      await mutationEdit.mutateAsync(data);
      const newUser = getUser();
      if (newUser) {
        newUser.data = {...newUser.data, ...data};
        setUser(newUser);
      }
      queryClient.invalidateQueries({queryKey: ['profile']});
      navigate(routes.Profile);
    } catch (error) {
      console.log(error);
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
    setSelectedImage(URL.createObjectURL(file));
    e.target.value = '';
  };

  return (
    <Page title="Thông tin cá nhân">
      <form
        className="card space-y-5 p-5 md:p-7"
        onSubmit={e => {
          e.preventDefault();
          handleSaveProfile();
        }}>
        <div className="flex flex-col items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="Chọn ảnh đại diện"
            className="group relative size-28 rounded-full">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt=""
                className="size-28 rounded-full object-cover ring-4 ring-brand-50"
              />
            ) : (
              <span className="block size-28 rounded-full bg-slate-200" />
            )}
            <span className="absolute right-0 bottom-0 grid size-9 place-items-center rounded-full bg-brand-500 text-white ring-4 ring-white transition group-hover:bg-brand-600">
              <IoCamera size={18} />
            </span>
          </button>
          <span className="text-xs text-slate-500">Nhấn để đổi ảnh đại diện</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFile}
          />
        </div>

        <Field label="Họ và tên" htmlFor="fullname">
          <input
            id="fullname"
            className="field"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" className="field" value={email} readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Số điện thoại" htmlFor="phone">
            <input
              id="phone"
              className="field"
              value={newPhone}
              inputMode="numeric"
              placeholder="10 chữ số"
              onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label="Địa chỉ" htmlFor="address">
            <input
              id="address"
              className="field"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="btn btn-primary h-12 w-full text-base"
          disabled={saving}>
          {saving && <Spinner size={18} color="#fff" />}
          {saving ? 'Đang lưu...' : 'Lưu lại'}
        </button>
      </form>
    </Page>
  );
}
