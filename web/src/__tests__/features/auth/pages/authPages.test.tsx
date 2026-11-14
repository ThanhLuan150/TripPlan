import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {authApi} from '@/features/auth/api/authApi';
import LandingPage from '@/features/auth/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import VerifyAccountPage from '@/features/auth/pages/VerifyAccountPage';
import ResetCodePage from '@/features/auth/pages/ResetCodePage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import {getSession, saveSession} from '@/features/auth/store/session';
import {storage, StorageKeys} from '@/lib/storage';
import {
  currentPath,
  httpError,
  networkError,
  pending,
  renderWithProviders,
  t,
} from '../../../utils/render';

vi.mock('@/features/auth/api/authApi');

beforeEach(() => {
  vi.resetAllMocks();
});

const session = {message: 'Login successfully', accessToken: 'token', data: {username: 'lan', email: 'lan@x.vn'}};

describe('LandingPage', () => {
  it('"start" opens the sign-in page for a visitor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(t('auth.landing.description'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('auth.landing.start')}));

    expect(await currentPath()).toBe('/login');
  });

  it('"start" goes home when already signed in', async () => {
    saveSession(session);
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);

    await user.click(screen.getByRole('button', {name: t('auth.landing.start')}));
    expect(await currentPath()).toBe('/home');
  });

  it('"start" opens the admin panel for an admin', async () => {
    saveSession({...session, data: {...session.data, role: 'admin'}});
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);

    await user.click(screen.getByRole('button', {name: t('auth.landing.start')}));
    expect(await currentPath()).toBe('/admin/dashboard');
  });

  it('is shown on every visit, signed in or not (no automatic redirect)', async () => {
    const {unmount} = renderWithProviders(<LandingPage />);
    unmount();

    // second visit, now signed in
    saveSession(session);
    renderWithProviders(<LandingPage />);

    expect(screen.getByRole('button', {name: t('auth.landing.start')})).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryByTestId('location')).toBeNull();
  });
});

describe('LoginPage', () => {
  const fill = async (username = 'traveler', password = 'secret1') => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(t('auth.login.username')), username);
    await user.type(screen.getByLabelText(t('auth.login.password')), password);
    await user.click(screen.getByRole('button', {name: t('auth.login.submit')}));
  };

  it('shows the validation errors', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, {route: '/login'});

    await user.click(screen.getByRole('button', {name: t('auth.login.submit')}));

    expect(await screen.findByText(t('validation.usernameRequired'))).toBeInTheDocument();
    expect(screen.getByText(t('validation.passwordRequired'))).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('signs in, stores the session and goes home', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session);
    renderWithProviders(<LoginPage />, {route: '/login'});

    await fill();

    expect(await currentPath()).toBe('/home');
    expect(authApi.login).toHaveBeenCalledWith({username: 'traveler', password: 'secret1'});
    expect(getSession()).toEqual(session);
    expect(screen.getByText(t('auth.login.success'))).toBeInTheDocument();
  });

  it('sends an admin to the admin panel', async () => {
    const adminSession = {...session, data: {...session.data, role: 'admin' as const}};
    vi.mocked(authApi.login).mockResolvedValue(adminSession);
    renderWithProviders(<LoginPage />, {route: '/login'});

    await fill();

    expect(await currentPath()).toBe('/admin/dashboard');
    expect(getSession()).toEqual(adminSession);
  });

  it('sends a user whose role is "user" home', async () => {
    vi.mocked(authApi.login).mockResolvedValue({...session, data: {...session.data, role: 'user'}});
    renderWithProviders(<LoginPage />, {route: '/login'});

    await fill();

    expect(await currentPath()).toBe('/home');
  });

  it('sends an admin back to the page they wanted, not to the panel', async () => {
    vi.mocked(authApi.login).mockResolvedValue({...session, data: {...session.data, role: 'admin'}});
    renderWithProviders(<LoginPage />, {route: '/login', state: {from: {pathname: '/admin/users'}}});

    await fill();

    expect(await currentPath()).toBe('/admin/users');
  });

  it('returns to the page the user wanted', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session);
    renderWithProviders(<LoginPage />, {route: '/login', state: {from: {pathname: '/ranking'}}});

    await fill();

    expect(await currentPath()).toBe('/ranking');
  });

  it.each([
    ['an unverified account', httpError(404, {message: 'Unverified account'}), 'auth.login.unverified'],
    ['an unknown user', httpError(404, {message: 'The account is not registered'}), 'auth.login.wrongCredentials'],
    ['a wrong password', httpError(401, {message: 'Incorrect password'}), 'auth.login.wrongCredentials'],
    ['an unreachable backend', networkError(), 'common.networkError'],
    ['the database being down', httpError(503), 'common.databaseError'],
    ['any other error', httpError(400, {message: 'The account has been deleted'}), 'auth.login.failed'],
  ])('explains %s', async (_label, error, key) => {
    vi.mocked(authApi.login).mockRejectedValue(error);
    renderWithProviders(<LoginPage />, {route: '/login'});

    await fill();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(getSession()).toBeNull();
  });

  it('disables the button while signing in', async () => {
    vi.mocked(authApi.login).mockReturnValue(pending());
    renderWithProviders(<LoginPage />, {route: '/login'});

    await fill();

    expect(screen.getByRole('button', {name: t('auth.login.submit')})).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('links to sign-up and forgot password', () => {
    renderWithProviders(<LoginPage />, {route: '/login'});

    expect(screen.getByRole('link', {name: t('auth.login.signUp')})).toHaveAttribute('href', '/registration');
    expect(screen.getByRole('link', {name: t('auth.login.forgot')})).toHaveAttribute('href', '/forgot-password');
  });
});

describe('RegisterPage', () => {
  const fill = async ({confirm = 'secret1'} = {}) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(t('auth.register.email')), 'lan@x.vn');
    await user.type(screen.getByLabelText(t('auth.login.username')), 'traveler');
    await user.type(screen.getByLabelText(t('auth.login.password')), 'secret1');
    await user.type(screen.getByLabelText(t('auth.register.confirmPassword')), confirm);
    await user.click(screen.getByRole('button', {name: t('auth.register.submit')}));
  };

  it('refuses different passwords', async () => {
    renderWithProviders(<RegisterPage />, {route: '/registration'});

    await fill({confirm: 'secret2'});

    expect(await screen.findByText(t('auth.register.passwordMismatch'))).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('registers, remembers the email and asks for the code', async () => {
    vi.mocked(authApi.register).mockResolvedValue({message: 'ok'});
    renderWithProviders(<RegisterPage />, {route: '/registration'});

    await fill();

    expect(await currentPath()).toBe('/verify-account');
    expect(authApi.register).toHaveBeenCalledWith({
      email: 'lan@x.vn',
      username: 'traveler',
      password: 'secret1',
      confirmPassword: 'secret1',
    });
    expect(storage.getItem(StorageKeys.registeredEmail)).toBe('lan@x.vn');
  });

  it.each([
    ['email', httpError(401, {message: 'Username or email already exist', field: 'email'}), 'auth.register.emailTaken'],
    ['username', httpError(401, {message: 'Username or email already exist', field: 'username'}), 'auth.register.usernameTaken'],
    ['account (older backend)', httpError(401, {message: 'Username or email already exist'}), 'auth.register.exists'],
    ['network', networkError(), 'common.networkError'],
    ['other', httpError(500), 'auth.register.failed'],
  ])('explains a taken %s / failure', async (_label, error, key) => {
    vi.mocked(authApi.register).mockRejectedValue(error);
    renderWithProviders(<RegisterPage />, {route: '/registration'});

    await fill();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
  });

  it('validates the email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, {route: '/registration'});

    await user.type(screen.getByLabelText(t('auth.register.email')), 'not-an-email');
    await user.click(screen.getByRole('button', {name: t('auth.register.submit')}));

    expect(await screen.findByText(t('validation.emailInvalid'))).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage', () => {
  it('sends a code and goes to the code step', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue({message: 'ok'});
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />, {route: '/forgot-password'});

    await user.type(screen.getByLabelText(t('auth.forgot.email')), 'lan@x.vn');
    await user.click(screen.getByRole('button', {name: t('auth.forgot.submit')}));

    expect(await currentPath()).toBe('/refresh-verify-code');
    expect(authApi.forgotPassword).toHaveBeenCalledWith('lan@x.vn');
    expect(storage.getItem(StorageKeys.resetEmail)).toBe('lan@x.vn');
  });

  it.each([
    [httpError(401, {message: 'The email is not exist'}), 'auth.forgot.failed'],
    [networkError(), 'common.networkError'],
  ])('explains a failure', async (error, key) => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(error);
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />, {route: '/forgot-password'});

    await user.type(screen.getByLabelText(t('auth.forgot.email')), 'lan@x.vn');
    await user.click(screen.getByRole('button', {name: t('auth.forgot.submit')}));

    expect(await screen.findByText(t(key))).toBeInTheDocument();
  });

  it('disables the button while sending', async () => {
    vi.mocked(authApi.forgotPassword).mockReturnValue(pending());
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />, {route: '/forgot-password'});

    await user.type(screen.getByLabelText(t('auth.forgot.email')), 'lan@x.vn');
    await user.click(screen.getByRole('button', {name: t('auth.forgot.submit')}));

    expect(screen.getByRole('button', {name: t('auth.forgot.submit')})).toBeDisabled();
  });

  it('requires an email and links back to sign-in', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />, {route: '/forgot-password'});

    await user.click(screen.getByRole('button', {name: t('auth.forgot.submit')}));

    expect(await screen.findByText(t('validation.emailRequired'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('auth.backToLogin')})).toHaveAttribute('href', '/login');
  });
});

describe('code pages (VerifyAccountPage, ResetCodePage)', () => {
  const cases = [
    {
      name: 'VerifyAccountPage',
      Page: VerifyAccountPage,
      route: '/verify-account',
      emailKey: StorageKeys.registeredEmail,
      api: () => vi.mocked(authApi.confirmAccount),
      next: '/login',
    },
    {
      name: 'ResetCodePage',
      Page: ResetCodePage,
      route: '/refresh-verify-code',
      emailKey: StorageKeys.resetEmail,
      api: () => vi.mocked(authApi.verifyResetCode),
      next: '/new-password',
    },
  ];

  describe.each(cases)('$name', ({Page, route, emailKey, api, next}) => {
    const submit = () => screen.getByRole('button', {name: t('auth.verify.submit')});

    it('shows where the code was sent', () => {
      storage.setItem(emailKey, 'lan@x.vn');
      renderWithProviders(<Page />, {route});

      expect(screen.getByText('lan@x.vn')).toHaveClass('font-semibold');
    });

    it('says "your email" when the address is unknown', () => {
      renderWithProviders(<Page />, {route});

      expect(screen.getByRole('heading', {level: 1}).nextSibling).toHaveTextContent(t('auth.verify.yourEmail'));
    });

    it('needs all 6 digits', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Page />, {route});

      await user.keyboard('123');
      await user.click(submit());

      expect(await screen.findByText(t('auth.verify.incomplete'))).toBeInTheDocument();
      expect(api()).not.toHaveBeenCalled();
    });

    it('checks the code and moves on', async () => {
      storage.setItem(emailKey, 'lan@x.vn');
      api().mockResolvedValue({message: 'ok'});
      const user = userEvent.setup();
      renderWithProviders(<Page />, {route});

      await user.keyboard('123456');
      await user.click(submit());

      expect(await currentPath()).toBe(next);
      expect(api()).toHaveBeenCalledWith('lan@x.vn', '123456');
    });

    it.each([
      [httpError(401, {message: 'Your code is not correct'}), 'auth.verify.wrongCode'],
      [httpError(500), 'auth.verify.failed'],
      [networkError(), 'common.networkError'],
    ])('explains a failure', async (error, key) => {
      api().mockRejectedValue(error);
      const user = userEvent.setup();
      renderWithProviders(<Page />, {route});

      await user.keyboard('123456');
      await user.click(submit());

      expect(await screen.findByText(t(key))).toBeInTheDocument();
      expect(submit()).toBeEnabled();
    });
  });
});

describe('NewPasswordPage', () => {
  const fill = async (password = 'newpass1', confirm = password) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(t('auth.newPassword.password')), password);
    await user.type(screen.getByLabelText(t('auth.newPassword.confirm')), confirm);
    await user.click(screen.getByRole('button', {name: t('auth.newPassword.submit')}));
  };

  it('shows the validation errors', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewPasswordPage />, {route: '/new-password'});

    await user.click(screen.getByRole('button', {name: t('auth.newPassword.submit')}));

    expect(await screen.findByText(t('validation.passwordRequired'))).toBeInTheDocument();
    expect(screen.getByText(t('validation.confirmRequired'))).toBeInTheDocument();
  });

  it('disables the button while saving', async () => {
    vi.mocked(authApi.resetPassword).mockReturnValue(pending());
    renderWithProviders(<NewPasswordPage />, {route: '/new-password'});

    await fill();

    expect(screen.getByRole('button', {name: t('auth.newPassword.submit')})).toBeDisabled();
  });

  it('refuses different passwords', async () => {
    renderWithProviders(<NewPasswordPage />, {route: '/new-password'});

    await fill('newpass1', 'newpass2');

    expect(await screen.findByText(t('auth.newPassword.mismatch'))).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('saves the new password for the email of the reset and goes to sign-in', async () => {
    storage.setItem(StorageKeys.resetEmail, 'lan@x.vn');
    vi.mocked(authApi.resetPassword).mockResolvedValue({message: 'ok'});
    renderWithProviders(<NewPasswordPage />, {route: '/new-password'});

    await fill();

    expect(await currentPath()).toBe('/login');
    expect(authApi.resetPassword).toHaveBeenCalledWith('lan@x.vn', {password: 'newpass1', confirmPassword: 'newpass1'});
  });

  it.each([
    [httpError(401, {message: 'Please verify the code sent to your email first'}), 'auth.newPassword.expired'],
    [httpError(404), 'auth.newPassword.wrongInfo'],
    [httpError(500), 'auth.newPassword.failed'],
  ])('explains a failure', async (error, key) => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(error);
    renderWithProviders(<NewPasswordPage />, {route: '/new-password'});

    await fill();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
  });
});
