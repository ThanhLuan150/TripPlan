import {alert, subscribeAlert} from '../src/lib/alert';

describe('alert', () => {
  it('does nothing without a subscriber', () => {
    expect(() => alert.success('x')).not.toThrow();
  });

  it('sends each kind to the subscriber', () => {
    const fn = jest.fn();
    const off = subscribeAlert(fn);
    alert.success('ok', 'm');
    alert.error('bad');
    alert.info('fyi');
    const onConfirm = jest.fn();
    alert.confirm({title: 'sure?', destructive: true, onConfirm});
    expect(fn.mock.calls.map(c => c[0])).toEqual([
      {type: 'success', title: 'ok', message: 'm'},
      {type: 'error', title: 'bad', message: undefined},
      {type: 'info', title: 'fyi', message: undefined},
      {type: 'confirm', title: 'sure?', destructive: true, onConfirm},
    ]);
    off();
  });

  it('stops after unsubscribe', () => {
    const fn = jest.fn();
    subscribeAlert(fn)();
    alert.info('x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('a stale unsubscribe does not remove a newer subscriber', () => {
    const first = jest.fn();
    const second = jest.fn();
    const offFirst = subscribeAlert(first);
    const offSecond = subscribeAlert(second);
    offFirst();
    alert.info('x');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    offSecond();
  });
});
