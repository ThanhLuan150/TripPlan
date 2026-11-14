// The "App home page" admin page: slider pictures and destination suggestions.
import {act, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import Toast from '@/components/ui/Toast';
import * as adminApi from '@/features/admin/api';
import HomeContentPage from '@/features/admin/pages/HomeContentPage';
import {mockShowcase} from '@/__tests__/fixtures/admin/data';
import {uploadImage} from '@/lib/upload';
import {httpError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/lib/upload', () => ({uploadImage: vi.fn(), uploadErrorKey: (e: {code?: string}) => (e?.code === 'big' ? 'common.imageTooLarge' : null)}));

const page = () => renderWithProviders(<HomeContentPage />, {route: '/admin/home'});
const banners = () => within(screen.getByRole('list', {name: t('admin.showcase.sections.banner')})).getAllByRole('listitem');
const suggestions = () =>
  within(screen.getByRole('list', {name: t('admin.showcase.sections.suggestion')})).getAllByRole('listitem');
const file = () => new File(['x'], 'a.png', {type: 'image/png'});

describe('HomeContentPage', () => {
  it('shows a skeleton, then the two sections', async () => {
    vi.mocked(adminApi.fetchShowcase).mockReturnValueOnce(pending());
    const {unmount} = page();
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();

    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});
    expect(banners()).toHaveLength(3);
    expect(suggestions()).toHaveLength(2);
    expect(within(banners()[2]).getByText(t('admin.status.hidden'))).toBeInTheDocument();
    expect(within(suggestions()[0]).getByText('Lâm Đồng')).toBeInTheDocument();
    expect(within(suggestions()[1]).getByText(t('admin.showcase.untitled'))).toBeInTheDocument();
  });

  it('says what the user will see when a section is empty', async () => {
    vi.mocked(adminApi.fetchShowcase).mockResolvedValue([]);
    page();

    expect(await screen.findByText(t('admin.showcase.empty.banner'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.showcase.empty.suggestion'))).toBeInTheDocument();
  });

  it('adds a slide: needs a picture, uploads it, saves it', async () => {
    vi.mocked(uploadImage).mockResolvedValue('https://cdn.example.com/new.jpg');
    vi.mocked(adminApi.postShowcase).mockResolvedValue({...mockShowcase[0], id: 'new'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});

    await user.click(screen.getByRole('button', {name: t('admin.showcase.add', {kind: t('admin.showcase.kinds.banner')})}));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));
    expect(within(dialog).getByText(t('admin.showcase.errors.imageRequired'))).toBeInTheDocument();
    expect(adminApi.postShowcase).not.toHaveBeenCalled();
    // a slide has no province
    expect(within(dialog).queryByLabelText(t('admin.showcase.fields.location'))).toBeNull();

    await user.upload(within(dialog).getByLabelText(t('admin.showcase.chooseImage'), {selector: 'input'}), file());
    await user.type(within(dialog).getByLabelText(t('admin.showcase.fields.title')), ' Hạ Long ');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() =>
      expect(adminApi.postShowcase).toHaveBeenCalledWith({
        kind: 'banner',
        imageUrl: 'https://cdn.example.com/new.jpg',
        title: 'Hạ Long',
        location: '',
        sortOrder: 0,
        status: 'published',
      }),
    );
    expect(await screen.findByText(t('admin.showcase.created'))).toBeInTheDocument();
    expect(adminApi.fetchShowcase).toHaveBeenCalledTimes(2);
  });

  it('adds a suggestion with the province a plan starts for', async () => {
    vi.mocked(uploadImage).mockResolvedValue('https://cdn.example.com/s.jpg');
    vi.mocked(adminApi.postShowcase).mockResolvedValue(mockShowcase[3]);
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.suggestion')});

    await user.click(screen.getByRole('button', {name: t('admin.showcase.add', {kind: t('admin.showcase.kinds.suggestion')})}));
    const dialog = screen.getByRole('dialog');
    await user.upload(within(dialog).getByLabelText(t('admin.showcase.chooseImage'), {selector: 'input'}), file());
    await user.type(within(dialog).getByLabelText(t('admin.showcase.fields.location')), 'Ninh Bình');
    await user.selectOptions(within(dialog).getByLabelText(t('admin.common.status')), 'hidden');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() =>
      expect(adminApi.postShowcase).toHaveBeenCalledWith(expect.objectContaining({kind: 'suggestion', location: 'Ninh Bình', status: 'hidden'})),
    );
  });

  it('validates the order, and shows the backend message when saving fails', async () => {
    vi.mocked(adminApi.patchShowcase).mockRejectedValue(httpError(400, {message: 'Invalid imageUrl'}));
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});

    await user.click(screen.getByRole('button', {name: t('admin.common.editItem', {name: 'Banner 1'})}));
    const dialog = screen.getByRole('dialog', {name: t('admin.showcase.edit', {kind: t('admin.showcase.kinds.banner')})});
    const order = within(dialog).getByLabelText(t('admin.showcase.fields.order'));
    await user.clear(order);
    await user.type(order, '99999');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));
    expect(within(dialog).getByText(t('admin.showcase.errors.order'))).toBeInTheDocument();

    await user.clear(order);
    await user.type(order, '5');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Invalid imageUrl');
    expect(adminApi.patchShowcase).toHaveBeenCalledWith('sb1', expect.objectContaining({sortOrder: 5, kind: 'banner'}));
  });

  it('shows why a picture could not be uploaded', async () => {
    vi.mocked(uploadImage).mockRejectedValue({code: 'big'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});

    await user.click(screen.getByRole('button', {name: t('admin.common.editItem', {name: 'Banner 1'})}));
    const dialog = screen.getByRole('dialog');
    await user.upload(within(dialog).getByLabelText(t('admin.showcase.chooseImage'), {selector: 'input'}), file());

    expect(await within(dialog).findByText(t('common.imageTooLarge'))).toBeInTheDocument();
  });

  it('deletes after asking', async () => {
    vi.mocked(adminApi.deleteShowcase).mockResolvedValue({});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});
    act(() => Toast.hide());

    await user.click(screen.getByRole('button', {name: t('admin.common.deleteItem', {name: 'Banner 2'})}));
    const dialog = screen.getByRole('alertdialog', {name: t('admin.showcase.deleteTitle')});
    await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
    expect(adminApi.deleteShowcase).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: t('admin.common.deleteItem', {name: 'Banner 2'})}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));

    expect(await screen.findByText(t('admin.showcase.deleted'))).toBeInTheDocument();
    expect(adminApi.deleteShowcase).toHaveBeenCalledWith('sb2');
  });

  it('shows the backend message when deleting fails', async () => {
    vi.mocked(adminApi.deleteShowcase).mockRejectedValue(httpError(404, {message: 'Picture not found'}));
    const user = userEvent.setup();
    page();
    await screen.findByRole('list', {name: t('admin.showcase.sections.banner')});

    await user.click(screen.getByRole('button', {name: t('admin.common.deleteItem', {name: 'Banner 2'})}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));

    expect(await screen.findByText('Picture not found')).toBeInTheDocument();
  });
});
