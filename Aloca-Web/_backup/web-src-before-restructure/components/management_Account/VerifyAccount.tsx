import {FormEvent, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {IoArrowBack, IoMailOpenOutline} from 'react-icons/io5';
import AuthShell from './AuthShell';
import OtpInput from './OtpInput';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

export default function VerifyAccount() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const email = storage.getItem('registeredEmail');

  const handleVerification = async (e?: FormEvent) => {
    e?.preventDefault();
    const enteredOTP = otp.join('');
    if (enteredOTP.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng nhập lại mã OTP',
      });
      return;
    }
    setSending(true);
    try {
      await api.post('/auth/confirm-account', {
        email,
        code: enteredOTP.toString(),
      });
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Xác thực thành công',
      });
      navigate(routes.Login);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        Toast.show({
          type: 'error',
          text1: 'Thất bại',
          text2: 'Mã OTP không chính xác',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Thất bại',
          text2: 'Xác thực không thành công',
        });
      }
      console.error('Verification failed:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Xác thực tài khoản"
      subtitle={
        <>
          Mã xác nhận gồm 6 chữ số đã được gửi tới{' '}
          {email ? (
            <span className="font-semibold text-slate-700">{email}</span>
          ) : (
            'email của bạn'
          )}
          .
        </>
      }
      footer={
        <Link
          to={routes.Login}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700">
          <IoArrowBack size={16} />
          Quay lại đăng nhập
        </Link>
      }>
      <form className="space-y-6" onSubmit={handleVerification}>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">
          <IoMailOpenOutline size={24} className="shrink-0" />
          Vui lòng nhập mã OTP trong email để kích hoạt tài khoản.
        </div>
        <OtpInput value={otp} onChange={setOtp} />
        <button
          type="submit"
          className="btn btn-primary h-12 w-full text-base"
          disabled={sending}>
          {sending && <Spinner size={18} color="#fff" />}
          Xác thực
        </button>
      </form>
    </AuthShell>
  );
}
