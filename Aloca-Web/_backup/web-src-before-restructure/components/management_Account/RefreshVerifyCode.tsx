import {FormEvent, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {IoArrowBack, IoShieldCheckmarkOutline} from 'react-icons/io5';
import AuthShell from './AuthShell';
import OtpInput from './OtpInput';
import Spinner from '../Spinner';
import Toast from '../Toast';
import {api} from '../../api/client';
import {storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';

// OTP step of "forgot password".
export default function RefreshVerifyCode() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const email = storage.getItem('emailResetPassword');

  const handleVerification = async (e?: FormEvent) => {
    e?.preventDefault();
    const enteredOTP = otp.join('');
    if (enteredOTP.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng nhập đầy đủ mã OTP !!',
      });
      return;
    }
    setSending(true);
    try {
      await api.post(`/auth/reset-password/${enteredOTP}`, {email});
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Xác thực thành công',
      });
      navigate(routes.NewPassword);
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
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Nhập mã xác thực"
      subtitle={
        <>
          Mã xác nhận đã được gửi tới{' '}
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
          to={routes.ForgotPassword}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700">
          <IoArrowBack size={16} />
          Gửi lại mã
        </Link>
      }>
      <form className="space-y-6" onSubmit={handleVerification}>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">
          <IoShieldCheckmarkOutline size={24} className="shrink-0" />
          Nhập mã OTP để tiếp tục đặt lại mật khẩu.
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
