import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import i18n from '@/lib/i18n';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Field from '@/components/ui/Field';
import SectionHeader from '@/components/ui/SectionHeader';
import Spinner from '@/components/ui/Spinner';
import Toast, {ToastHost} from '@/components/ui/Toast';

describe('SectionHeader', () => {
  it('shows the title and a "see more" link', () => {
    render(
      <MemoryRouter>
        <SectionHeader title="Video du lịch" to="/videos" icon={<span>🎬</span>} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', {name: /Video du lịch/})).toHaveTextContent('🎬Video du lịch');
    expect(screen.getByRole('link', {name: i18n.t('common.seeMore')})).toHaveAttribute('href', '/videos');
  });

  it('uses a custom link text, or no link without destination', () => {
    const {rerender} = render(
      <MemoryRouter>
        <SectionHeader title="Xếp hạng" to="/ranking" linkText="Tất cả" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', {name: 'Tất cả'})).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SectionHeader title="Xếp hạng" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('Spinner', () => {
  it('is an accessible progress indicator sized from its props', () => {
    render(<Spinner size={40} color="red" className="extra" />);

    const spinner = screen.getByRole('progressbar', {name: i18n.t('common.loading')});
    expect(spinner).toHaveClass('animate-spin', 'extra');
    expect(spinner).toHaveStyle({width: '40px', height: '40px', borderWidth: '4px'});
  });
});

describe('Field', () => {
  it('links the label to its control and shows the error', () => {
    render(
      <Field label="Email" htmlFor="email" error="Email không hợp lệ" aside={<a href="#x">?</a>}>
        <input id="email" />
      </Field>,
    );

    expect(screen.getByLabelText('Email')).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: '?'})).toBeInTheDocument();
  });

  it('shows no error message without error', () => {
    const {container} = render(
      <Field label="Tên" error={false}>
        <input />
      </Field>,
    );
    expect(container.querySelector('p')).toBeNull();
  });
});

describe('ConfirmModal', () => {
  const setup = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const utils = render(
      <ConfirmModal visible title="Xoá kế hoạch?" onCancel={onCancel} onConfirm={onConfirm} {...props}>
        Không thể hoàn tác
      </ConfirmModal>,
    );
    return {...utils, onCancel, onConfirm};
  };

  it('renders nothing while hidden', () => {
    setup({visible: false});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the title, body and default button labels', () => {
    setup();

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', {name: 'Xoá kế hoạch?'})).toBeInTheDocument();
    expect(screen.getByText('Không thể hoàn tác')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: i18n.t('common.cancel')})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: i18n.t('common.confirm')})).toHaveClass('btn-primary');
  });

  it('calls onConfirm / onCancel from the buttons', async () => {
    const user = userEvent.setup();
    const {onCancel, onConfirm} = setup({confirmText: 'Xoá', cancelText: 'Thôi', danger: true});

    await user.click(screen.getByRole('button', {name: 'Xoá'}));
    await user.click(screen.getByRole('button', {name: 'Thôi'}));

    expect(screen.getByRole('button', {name: 'Xoá'})).toHaveClass('btn-danger');
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cancels on Escape and on a backdrop click', () => {
    const {onCancel, container} = setup();

    fireEvent.keyDown(window, {key: 'Enter'});
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.click(container.querySelector('.backdrop-blur-sm')!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('stops listening to Escape once closed', () => {
    const {onCancel, rerender, onConfirm} = setup();
    rerender(<ConfirmModal visible={false} title="x" onCancel={onCancel} onConfirm={onConfirm} />);

    fireEvent.keyDown(window, {key: 'Escape'});
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('Toast', () => {
  afterEach(() => {
    act(() => Toast.hide());
    vi.useRealTimers();
  });

  it('shows a toast, replaces it with the next one and hides it after its time', () => {
    vi.useFakeTimers();
    render(<ToastHost />);

    act(() => Toast.show({type: 'success', text1: 'Đã lưu', text2: 'Kế hoạch đã được lưu'}));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưuKế hoạch đã được lưu');

    act(() => Toast.show({type: 'error', text1: 'Lỗi mạng', visibilityTime: 1000}));
    expect(screen.queryByText('Đã lưu')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi mạng');

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides a toast when clicked', () => {
    render(<ToastHost />);
    act(() => Toast.show({type: 'info', text1: 'Mẹo'}));

    fireEvent.click(screen.getByRole('status'));

    expect(screen.queryByText('Mẹo')).toBeNull();
  });
});
