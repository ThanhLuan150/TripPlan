import {InputHTMLAttributes, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoEye, IoEyeOff} from 'react-icons/io5';

// TextInput secureTextEntry + Ionicons eye toggle from the mobile forms.
export default function PasswordInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const {t} = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className="field pr-12"
      />
      <button
        type="button"
        aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
        onClick={() => setShow(!show)}
        className="absolute top-1 right-1 grid size-10 place-items-center rounded-lg text-slate-400 transition hover:text-slate-600">
        {show ? <IoEye size={20} /> : <IoEyeOff size={20} />}
      </button>
    </div>
  );
}
