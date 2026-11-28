import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import ReportPostButton from '@/features/trips/components/ReportPostButton';
import {httpError, networkError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const signIn = () => saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
const open = async () => userEvent.click(screen.getByRole('button', {name: t('trips.report.open')}));
const submit = () => userEvent.click(screen.getByRole('button', {name: t('trips.report.submit')}));
const reason = (key: string) => screen.getByRole('radio', {name: t(`trips.report.reasons.${key}`)});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('ReportPostButton', () => {
  describe('signed out', () => {
    it('is a link to sign in, never a button that opens the report', async () => {
      renderWithProviders(<ReportPostButton tripId="t1" />);

      const link = screen.getByRole('link', {name: t('trips.report.signIn')});
      expect(link).toHaveAttribute('href', '/login');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      await userEvent.click(link);
      expect(tripsApi.reportPost).not.toHaveBeenCalled();
    });
  });

  describe('signed in', () => {
    beforeEach(signIn);

    it('opens a list of reasons with "spam" chosen, and a description that is optional', async () => {
      renderWithProviders(<ReportPostButton tripId="t1" />);

      await open();

      expect(screen.getByRole('dialog', {name: t('trips.report.title')})).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(6);
      for (const key of ['spam', 'inappropriate', 'wrongLocation', 'copyright', 'misinformation', 'other']) {
        expect(reason(key)).toBeInTheDocument();
      }
      expect(reason('spam')).toBeChecked();
      expect(screen.getByLabelText(t('trips.report.descriptionOptional'))).toBeInTheDocument();
      expect(screen.getByText(t('trips.report.subtitle'))).toBeInTheDocument();
    });

    it('sends the chosen reason with the description and shows the thank you', async () => {
      vi.mocked(tripsApi.reportPost).mockResolvedValue({message: 'ok'});
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await userEvent.click(reason('inappropriate'));
      await userEvent.type(screen.getByLabelText(t('trips.report.descriptionOptional')), '  Rude photos ');
      await submit();

      expect(tripsApi.reportPost).toHaveBeenCalledWith('t1', 'inappropriate', 'Rude photos');
      expect(await screen.findByText(t('trips.report.success'))).toBeInTheDocument();
      expect(screen.getByText(t('trips.report.successText'))).toBeInTheDocument();
      await userEvent.click(screen.getAllByRole('button', {name: t('common.close')}).at(-1)!);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('the description can stay empty (nothing is sent for it)', async () => {
      vi.mocked(tripsApi.reportPost).mockResolvedValue({message: 'ok'});
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await submit();

      expect(tripsApi.reportPost).toHaveBeenCalledWith('t1', 'spam', undefined);
    });

    it('the reason "other" needs a description, and the error goes away once it is written', async () => {
      vi.mocked(tripsApi.reportPost).mockResolvedValue({message: 'ok'});
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await userEvent.click(reason('other'));
      await submit();
      expect(screen.getByRole('alert')).toHaveTextContent(t('trips.report.descriptionRequired'));
      expect(tripsApi.reportPost).not.toHaveBeenCalled();

      await userEvent.type(screen.getByLabelText(t('trips.report.descriptionLabel')), 'Something else');
      await submit();
      expect(tripsApi.reportPost).toHaveBeenCalledWith('t1', 'other', 'Something else');
    });

    it('refuses a description that is too long without calling the API', async () => {
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await userEvent.click(screen.getByLabelText(t('trips.report.descriptionOptional')));
      await userEvent.paste('a'.repeat(501));

      expect(screen.getByRole('alert')).toHaveTextContent(t('trips.report.tooLong', {max: 500}));
      expect(screen.getByRole('button', {name: t('trips.report.submit')})).toBeDisabled();
      expect(tripsApi.reportPost).not.toHaveBeenCalled();
    });

    it.each([
      [409, {message: 'You already reported this post'}, 'trips.report.duplicate'],
      [404, {message: 'Post not found'}, 'trips.report.unavailable'],
      [400, {message: 'You cannot report your own post'}, 'trips.report.own'],
      [500, {}, 'trips.report.failed'],
    ])('shows the right message for a %s answer', async (status, body, key) => {
      vi.mocked(tripsApi.reportPost).mockRejectedValue(httpError(status, body));
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(t(key));
      expect(screen.queryByText(t('trips.report.success'))).not.toBeInTheDocument();
    });

    it('shows the network error when the server cannot be reached', async () => {
      vi.mocked(tripsApi.reportPost).mockRejectedValue(networkError());
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();

      await submit();

      expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
    });

    it('Cancel and Escape close the dialog without sending anything', async () => {
      renderWithProviders(<ReportPostButton tripId="t1" />);
      await open();
      await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await open();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(tripsApi.reportPost).not.toHaveBeenCalled();
    });
  });
});
