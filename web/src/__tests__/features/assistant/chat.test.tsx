import {fireEvent, screen, within} from '@testing-library/react';
import {StrictMode} from 'react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '@/features/assistant/api/chatApi';
import ChatHistory from '@/features/assistant/components/ChatHistory';
import {ChatPage} from '@/features/assistant/pages/ChatPage';
import {chatCache, getSavedChatId, resetChatCache, saveChatId} from '@/features/assistant/store/chatCache';
import {currentPath, currentState, httpError, networkError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/assistant/api/chatApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/assistant/api/chatApi')>()),
  chatApi: {send: vi.fn(), list: vi.fn(), messages: vi.fn(), remove: vi.fn()},
}));

const chats = [
  {_id: 'c1', title: 'Đà Lạt 3 ngày', createdAt: '2026-03-01T10:00:00', updatedAt: '2026-03-02T10:00:00'},
  {_id: 'c2', title: '', createdAt: '2026-02-01T10:00:00'},
];

beforeEach(() => {
  vi.resetAllMocks();
  resetChatCache();
  vi.mocked(chatApi.list).mockResolvedValue(chats);
});

describe('ChatHistory', () => {
  const render = (props: Partial<Parameters<typeof ChatHistory>[0]> = {}) => {
    const handlers = {onClose: vi.fn(), onSelect: vi.fn(), onNewChat: vi.fn(), onDeleted: vi.fn()};
    renderWithProviders(<ChatHistory open currentId="c1" {...handlers} {...props} />);
    return handlers;
  };

  it('renders nothing while closed (and loads nothing)', () => {
    render({open: false});

    expect(screen.queryByRole('complementary')).toBeNull();
    expect(chatApi.list).not.toHaveBeenCalled();
  });

  it('lists the conversations, the current one highlighted', async () => {
    render();

    const current = await screen.findByRole('button', {name: /Đà Lạt 3 ngày/});
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveTextContent('2/3/2026'); // last message time
    const untitled = screen.getByText(t('assistant.untitled')).closest('button')!;
    expect(untitled).toHaveAttribute('aria-current', 'false');
    expect(untitled).toHaveTextContent('1/2/2026'); // falls back to creation time
  });

  it('opens a conversation or starts a new one', async () => {
    const user = userEvent.setup();
    const {onSelect, onNewChat} = render();

    await user.click(await screen.findByRole('button', {name: /Đà Lạt 3 ngày/}));
    await user.click(screen.getByRole('button', {name: t('assistant.newChat')}));

    expect(onSelect).toHaveBeenCalledWith('c1');
    expect(onNewChat).toHaveBeenCalled();
  });

  it('says when there is no conversation yet', async () => {
    vi.mocked(chatApi.list).mockResolvedValue([]);
    render();

    expect(await screen.findByText(t('assistant.noHistory'))).toBeInTheDocument();
  });

  it('shows placeholders while loading', () => {
    vi.mocked(chatApi.list).mockReturnValue(pending());
    render();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('deletes a conversation after confirmation', async () => {
    vi.mocked(chatApi.remove).mockResolvedValue({});
    const user = userEvent.setup();
    const {onDeleted} = render();

    const [firstDelete] = await screen.findAllByRole('button', {name: t('assistant.deleteChat')});
    await user.click(firstDelete);
    expect(screen.getByRole('dialog')).toHaveTextContent(t('assistant.deleteChatText', {title: 'Đà Lạt 3 ngày'}));
    await user.click(screen.getByRole('button', {name: t('common.delete')}));

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith('c1'));
    expect(vi.mocked(chatApi.remove).mock.calls[0][0]).toBe('c1');
    await vi.waitFor(() => expect(chatApi.list).toHaveBeenCalledTimes(2));
  });

  it('names an untitled conversation in the confirmation, and can cancel', async () => {
    const user = userEvent.setup();
    render();

    const deletes = await screen.findAllByRole('button', {name: t('assistant.deleteChat')});
    await user.click(deletes[1]);
    expect(screen.getByRole('dialog')).toHaveTextContent(t('assistant.deleteChatText', {title: t('assistant.untitled')}));
    await user.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(chatApi.remove).not.toHaveBeenCalled();
  });

  it('tells when the deletion failed', async () => {
    vi.mocked(chatApi.remove).mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    const {onDeleted} = render();

    await user.click((await screen.findAllByRole('button', {name: t('assistant.deleteChat')}))[0]);
    await user.click(screen.getByRole('button', {name: t('common.delete')}));

    expect(await screen.findByText(t('assistant.deleteFailed'))).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('closes with the X, the backdrop or Escape (not while confirming)', async () => {
    const user = userEvent.setup();
    const {onClose} = render();
    const panel = screen.getByRole('complementary', {name: t('assistant.historyTitle')});

    await user.click(within(panel).getByRole('button', {name: t('common.close')}));
    fireEvent.click(panel.previousElementSibling!);
    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.keyDown(window, {key: 'a'});
    expect(onClose).toHaveBeenCalledTimes(3);

    await user.click((await screen.findAllByRole('button', {name: t('assistant.deleteChat')}))[0]);
    fireEvent.keyDown(window, {key: 'Escape'});
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('ChatPage', () => {
  const render = () => renderWithProviders(<ChatPage />, {route: '/assistant/chat'});
  const input = () => screen.getByRole('textbox', {name: t('assistant.message')});
  const send = (text: string) => userEvent.setup().type(input(), `${text}{Enter}`);
  const answer = (text: string, id = 'c9') =>
    vi.mocked(chatApi.send).mockResolvedValueOnce({message: CHAT_SUCCESS, data: {ChatResponse: text, chatAi: {_id: id}}});

  it('greets the user and suggests questions', () => {
    render();

    expect(screen.getByText(t('assistant.welcome1'))).toBeInTheDocument();
    expect(screen.getByText(t('assistant.welcome2'))).toBeInTheDocument();
    expect(screen.getByText(t('assistant.suggestion2'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('assistant.newChat')})).toBeDisabled();
    expect(screen.getByRole('button', {name: t('assistant.send')})).toBeDisabled();
  });

  it('sends a question and shows the answer', async () => {
    answer('Đà Lạt đẹp nhất vào tháng 12.');
    render();

    await send('Nên đi Đà Lạt tháng mấy?');

    // the question bubble, and the conversation title in the toolbar
    expect(screen.getAllByText('Nên đi Đà Lạt tháng mấy?')).toHaveLength(2);
    expect(screen.getByTitle('Nên đi Đà Lạt tháng mấy?')).toBeInTheDocument();
    expect(await screen.findByText('Đà Lạt đẹp nhất vào tháng 12.')).toBeInTheDocument();
    expect(chatApi.send).toHaveBeenCalledWith('Nên đi Đà Lạt tháng mấy?', null);
    expect(input()).toHaveValue('');
    // the conversation is remembered (for a page reload) and continued
    expect(getSavedChatId()).toBe('c9');
    expect(chatCache.idChat).toBe('c9');
    expect(screen.queryByText(t('assistant.suggestion2'))).toBeNull();

    answer('Có, khá lạnh.');
    await send('Có lạnh không?');
    expect(await screen.findByText('Có, khá lạnh.')).toBeInTheDocument();
    expect(chatApi.send).toHaveBeenLastCalledWith('Có lạnh không?', 'c9');
  });

  it('shows "typing" while waiting and blocks a second message', async () => {
    vi.mocked(chatApi.send).mockReturnValue(pending());
    render();

    await send('Xin chào');

    expect(screen.getByLabelText(t('assistant.typing'))).toBeInTheDocument();
    await send('Thêm nữa');
    expect(chatApi.send).toHaveBeenCalledOnce();
  });

  it('a suggestion sends itself', async () => {
    answer('Vũng Tàu, Cần Giờ...');
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('assistant.suggestion1')}));

    expect(chatApi.send).toHaveBeenCalledWith(t('assistant.suggestion1'), null);
    expect(await screen.findByText('Vũng Tàu, Cần Giờ...')).toBeInTheDocument();
  });

  it('Shift+Enter adds a new line instead of sending', async () => {
    const user = userEvent.setup();
    render();

    await user.type(input(), 'dòng 1{Shift>}{Enter}{/Shift}dòng 2');

    expect(input()).toHaveValue('dòng 1\ndòng 2');
    expect(chatApi.send).not.toHaveBeenCalled();
  });

  it('does not send blank messages', async () => {
    render();

    await send('   ');

    expect(chatApi.send).not.toHaveBeenCalled();
  });

  it('the AI "error" answer can be sent again', async () => {
    vi.mocked(chatApi.send).mockResolvedValueOnce({message: CHAT_ERROR, chatAi: {_id: 'c5'}});
    answer('Đây là câu trả lời.');
    const user = userEvent.setup();
    render();

    await send('Câu hỏi');
    expect(await screen.findByText(t('assistant.error'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('assistant.resend')}));

    expect(await screen.findByText('Đây là câu trả lời.')).toBeInTheDocument();
    expect(screen.queryByText(t('assistant.error'))).toBeNull();
    expect(chatApi.send).toHaveBeenLastCalledWith('Câu hỏi', 'c5');
  });

  it('shows any other backend message as an answer', async () => {
    vi.mocked(chatApi.send).mockResolvedValue({message: 'Trả lời kiểu cũ'});
    render();

    await send('hi');

    expect(await screen.findByText('Trả lời kiểu cũ')).toBeInTheDocument();
  });

  it.each([
    ['the backend is unreachable', networkError(), 'common.networkError'],
    ['the AI is unavailable', httpError(500, {code: 'AI_QUOTA'}), 'assistant.aiUnavailable'],
    ['another error', httpError(400), 'assistant.error'],
  ])('explains when %s', async (_label, error, key) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(chatApi.send).mockRejectedValue(error);
    render();

    await send('hi');

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('assistant.resend')})).toBeInTheDocument();
  });

  it('starts a new conversation', async () => {
    answer('A1');
    const user = userEvent.setup();
    render();
    await send('Q1');
    await screen.findByText('A1');

    await user.click(screen.getByRole('button', {name: t('assistant.newChat')}));

    expect(screen.queryAllByText('Q1')).toHaveLength(0);
    expect(getSavedChatId()).toBeNull();
    expect(chatCache.idChat).toBeNull();
  });

  it('opens a saved conversation from the history', async () => {
    vi.mocked(chatApi.messages).mockResolvedValue([
      {role: 'user', text: 'Ăn gì ở Hà Nội?', createdAt: '2026-03-01T10:00:00'},
      {role: 'model', text: 'Phở, bún chả...', createdAt: '2026-03-01T10:01:00'},
    ]);
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click(await screen.findByRole('button', {name: /Đà Lạt 3 ngày/}));

    expect(await screen.findByText('Phở, bún chả...')).toBeInTheDocument();
    expect(chatApi.messages).toHaveBeenCalledWith('c1');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(getSavedChatId()).toBe('c1');
    // the toolbar shows the first question as title
    expect(screen.getByTitle('Ăn gì ở Hà Nội?')).toBeInTheDocument();
  });

  it('shows placeholders while a conversation loads', async () => {
    vi.mocked(chatApi.messages).mockReturnValue(pending());
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click(await screen.findByRole('button', {name: /Đà Lạt 3 ngày/}));

    expect(screen.getByLabelText(t('assistant.loadingChat'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('assistant.send')})).toBeDisabled();
  });

  it('a conversation deleted meanwhile starts over', async () => {
    saveChatId('c1');
    vi.mocked(chatApi.messages).mockRejectedValue(httpError(404));
    render();

    await vi.waitFor(() => expect(getSavedChatId()).toBeNull());
    expect(screen.getByText(t('assistant.welcome1'))).toBeInTheDocument();
  });

  it('tells when a conversation cannot be loaded', async () => {
    saveChatId('c1');
    vi.mocked(chatApi.messages).mockRejectedValue(networkError());
    render();

    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
  });

  it('other load errors use the generic message', async () => {
    saveChatId('c1');
    vi.mocked(chatApi.messages).mockRejectedValue(httpError(500));
    render();

    expect(await screen.findByText(t('assistant.loadFailed'))).toBeInTheDocument();
  });

  it('reopens the last conversation after a page reload', async () => {
    saveChatId('c7');
    vi.mocked(chatApi.messages).mockResolvedValue([{role: 'user', text: 'Câu hỏi cũ', createdAt: '2026-03-01'}]);
    render();

    expect(await screen.findAllByText('Câu hỏi cũ')).toHaveLength(2);
    expect(chatApi.messages).toHaveBeenCalledWith('c7');
  });

  it('reopens it only once, even when effects run twice (StrictMode)', async () => {
    saveChatId('c7');
    vi.mocked(chatApi.messages).mockResolvedValue([{role: 'user', text: 'Câu hỏi cũ', createdAt: '2026-03-01'}]);
    renderWithProviders(
      <StrictMode>
        <ChatPage />
      </StrictMode>,
      {route: '/assistant/chat'},
    );

    expect(await screen.findAllByText('Câu hỏi cũ')).toHaveLength(2);
    expect(chatApi.messages).toHaveBeenCalledOnce();
  });

  it('keeps the open conversation when coming back to the tab', async () => {
    answer('A1');
    const {unmount} = render();
    await send('Q1');
    await screen.findByText('A1');
    unmount();

    render();

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(chatApi.messages).not.toHaveBeenCalled();
  });

  it('turns an AI answer into a pre-filled trip form', async () => {
    answer('Lịch trình Đà Lạt 3 ngày cho 2 người: Hồ Xuân Hương, Langbiang.');
    const user = userEvent.setup();
    render();
    await send('Đi Đà Lạt');

    await user.click(await screen.findByRole('button', {name: t('assistant.planFromSuggestion')}));

    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({
      location: 'Lâm Đồng',
      days: 3,
      people: 2,
      note: 'Lịch trình Đà Lạt 3 ngày cho 2 người: Hồ Xuân Hương, Langbiang.',
      fromChat: true,
    });
  });

  it('when the current conversation is deleted from the history, starts over', async () => {
    vi.mocked(chatApi.messages).mockResolvedValue([{role: 'user', text: 'Q', createdAt: '2026-03-01'}]);
    vi.mocked(chatApi.remove).mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click(await screen.findByRole('button', {name: /Đà Lạt 3 ngày/}));
    await screen.findAllByText('Q');

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click((await screen.findAllByRole('button', {name: t('assistant.deleteChat')}))[0]);
    await user.click(screen.getByRole('button', {name: t('common.delete')}));

    await vi.waitFor(() => expect(screen.queryAllByText('Q')).toHaveLength(0));
    expect(getSavedChatId()).toBeNull();
  });

  it('deleting another conversation keeps the current one', async () => {
    vi.mocked(chatApi.messages).mockResolvedValue([{role: 'user', text: 'Q', createdAt: '2026-03-01'}]);
    vi.mocked(chatApi.remove).mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click(await screen.findByRole('button', {name: /Đà Lạt 3 ngày/}));
    await screen.findAllByText('Q');

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    await user.click((await screen.findAllByRole('button', {name: t('assistant.deleteChat')}))[1]);
    await user.click(screen.getByRole('button', {name: t('common.delete')}));

    await vi.waitFor(() => expect(chatApi.remove).toHaveBeenCalled());
    expect(screen.getAllByText('Q')).toHaveLength(2);
  });

  it('the history panel offers a new chat too', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    const panel = await screen.findByRole('complementary');
    await user.click(within(panel).getByRole('button', {name: t('assistant.newChat')}));

    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('the history panel can be closed', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('assistant.historyTitle')}));
    const panel = await screen.findByRole('complementary');
    await user.click(within(panel).getByRole('button', {name: t('common.close')}));

    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
