import {it, expect} from '@jest/globals';
import i18n from '../src/i18n';
import {errorText} from '../src/lib/apiClient';

it('shows a connection message when the server does not answer', () => {
  expect(errorText(new Error('Network Error'))).toBe(i18n.t('common.network'));
});

it('shows the backend message when there is one', () => {
  expect(errorText({response: {data: {message: 'Sai mật khẩu'}}})).toBe('Sai mật khẩu');
});
