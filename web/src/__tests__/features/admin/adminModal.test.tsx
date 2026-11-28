import {fireEvent, render, renderHook, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import Toast from '@/components/ui/Toast';
import AdminModal from '@/features/admin/components/AdminModal';
import {useAdminToast} from '@/features/admin/hooks/useAdminToast';
import {httpError} from '../../utils/render';

afterEach(() => vi.restoreAllMocks());

const modal = (props: Partial<React.ComponentProps<typeof AdminModal>> = {}) => {
  const onClose = vi.fn();
  render(
    <>
      <button>opener</button>
      <AdminModal title="Title" onClose={onClose} footer={<button>last</button>} {...props}>
        <input aria-label="first" />
      </AdminModal>
    </>,
  );
  return onClose;
};

describe('AdminModal', () => {
  it('focuses the first field, describes itself and closes with Escape and the backdrop', () => {
    const onClose = modal({description: 'About it', size: 'lg', role: 'alertdialog'});

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('About it');
    expect(screen.getByLabelText('first')).toHaveFocus();
    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.click(document.querySelector('[aria-hidden]')!);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape and the backdrop while busy', () => {
    const onClose = modal({busy: true});

    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.click(document.querySelector('[aria-hidden]')!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog, both ways', () => {
    modal();
    const first = screen.getByLabelText('first');
    const last = screen.getByRole('button', {name: 'last'});
    const close = document.querySelector<HTMLElement>('header button')!;

    close.focus();
    fireEvent.keyDown(window, {key: 'Tab', shiftKey: true});
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, {key: 'Tab'});
    expect(close).toHaveFocus();
    first.focus();
    fireEvent.keyDown(window, {key: 'Tab'});
    expect(first).toHaveFocus();
  });

  it('lets Tab go when nothing in it can take the focus', () => {
    modal({busy: true, footer: null, children: <p>text</p>});

    expect(() => fireEvent.keyDown(window, {key: 'Tab'})).not.toThrow();
  });

  it('focuses a button of the dialog when the body has no field', () => {
    render(
      <AdminModal title="T" onClose={() => undefined} footer={<button>ok</button>}>
        <p>no field</p>
      </AdminModal>,
    );

    expect(document.querySelector('header button')).toHaveFocus();
  });
});

describe('useAdminToast', () => {
  it('shows the message of the backend, or a generic one', () => {
    const show = vi.spyOn(Toast, 'show').mockImplementation(() => undefined as never);
    const {result} = renderHook(() => useAdminToast());

    result.current.done('Saved');
    result.current.failed(httpError(400, {message: 'Nope'}));
    result.current.failed(new Error('x'));

    expect(show).toHaveBeenNthCalledWith(1, {type: 'success', text1: 'Saved'});
    expect(show.mock.calls[1][0]).toMatchObject({type: 'error', text2: 'Nope'});
    expect(show.mock.calls[2][0]).toMatchObject({type: 'error'});
  });
});
