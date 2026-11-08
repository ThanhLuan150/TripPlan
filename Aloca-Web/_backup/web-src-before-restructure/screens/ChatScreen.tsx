import {FormEvent, KeyboardEvent, useEffect, useRef, useState} from 'react';
import {FiSend} from 'react-icons/fi';
import {IoReload, IoSparkles} from 'react-icons/io5';
import {api} from '../api/client';
import logo from '../assets/images/Icon.png';

interface Message {
  type: 'bot' | 'user';
  text: string;
  error: boolean;
}

const ERROR_MESSAGE = 'Đã xảy ra lỗi trong quá trình gửi tin nhắn, thử lại';

const initialMessages: Message[] = [
  {
    type: 'bot',
    text: 'Xin chào, tôi là Aloca, trợ lý du lịch của bạn. Tôi có thể giúp bạn lên kế hoạch cho chuyến đi, giới thiệu điểm đến, giới thiệu khách sạn hoặc trả lời bất kỳ câu hỏi nào liên quan đến du lịch.',
    error: false,
  },
  {type: 'bot', text: 'Bạn muốn làm gì?', error: false},
];

const suggestions = [
  'Gợi ý điểm đến cuối tuần gần TP.HCM',
  'Lịch trình 3 ngày ở Đà Lạt',
  'Món ngon nên thử ở Hà Nội',
  'Kinh nghiệm đi Phú Quốc tiết kiệm',
];

// Keeps the conversation while the user moves between tabs (on mobile the
// tab screens stayed mounted). Cleared on page reload.
const chatCache: {messages: Message[]; idChat: string | null} = {
  messages: initialMessages,
  idChat: null,
};

function BotAvatar() {
  return (
    <img
      src={logo}
      alt=""
      className="size-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200"
    />
  );
}

export const ChatScreen = () => {
  const [data, setData] = useState<Message[]>(chatCache.messages);
  const [idChat, setIdChat] = useState<string | null>(chatCache.idChat);
  const [textInput, setTextInput] = useState('');
  const [reloadQuest, setReloadQuest] = useState('');
  const [isAnalyzing, setAnalyzing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatCache.messages = data;
    chatCache.idChat = idChat;
  }, [data, idChat]);

  // FlatList onContentSizeChange -> scrollToEnd
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTo({top: el.scrollHeight, behavior: 'smooth'});
    }
  }, [data, isAnalyzing]);

  const sendRequest = async (prompt: string) => {
    setAnalyzing(true);
    try {
      const res = await api.post('/chat', {message: prompt, idChat});
      const body = res.data;
      if (body.message === 'Send message successfully') {
        setData(prev => [
          ...prev,
          {type: 'bot', text: body.data.ChatResponse, error: false},
        ]);
        setIdChat(body.data.chatAi?._id ?? idChat);
      } else if (body.message === ERROR_MESSAGE) {
        setData(prev => [...prev, {type: 'bot', text: body.message, error: true}]);
        setIdChat(body.chatAi?._id ?? idChat);
      } else {
        setData(prev => [
          ...prev,
          {type: 'bot', text: body.message, error: false},
        ]);
        if (body.chatAi?._id) {
          setIdChat(body.chatAi._id);
        }
      }
    } catch (error) {
      console.error('Có lỗi xảy ra khi gửi yêu cầu:', error);
      setData(prev => [...prev, {type: 'bot', text: ERROR_MESSAGE, error: true}]);
    } finally {
      setAnalyzing(false);
    }
  };

  const sendPrompt = (text: string) => {
    const prompt = text.trim();
    if (!prompt || isAnalyzing) {
      return;
    }
    setReloadQuest(prompt);
    setData(prev => [...prev, {type: 'user', text: prompt, error: false}]);
    setTextInput('');
    sendRequest(prompt);
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    sendPrompt(textInput);
  };

  const reloadSend = () => {
    setData(prev => prev.filter(item => item.error !== true));
    sendRequest(reloadQuest);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const noUserMessage = !data.some(m => m.type === 'user');

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col md:h-[calc(100dvh-7.5rem)]">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="flex min-h-full flex-col justify-end gap-3">
          {data.map((item, index) =>
            item.type === 'user' ? (
              <div key={index} className="flex animate-pop-in justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 break-words whitespace-pre-wrap text-white shadow-sm md:max-w-[70%]">
                  {item.text}
                </p>
              </div>
            ) : (
              <div key={index} className="flex animate-pop-in items-end gap-2">
                <BotAvatar />
                <div className="flex max-w-[85%] flex-col items-start gap-1 md:max-w-[75%]">
                  <p
                    className={`rounded-2xl rounded-bl-md bg-white px-4 py-2.5 leading-relaxed break-words whitespace-pre-wrap shadow-soft ring-1 ${
                      item.error
                        ? 'text-rose-700 ring-rose-200'
                        : 'text-slate-800 ring-slate-100'
                    }`}>
                    {item.text}
                  </p>
                  {item.error && index === data.length - 1 && !isAnalyzing && (
                    <button
                      type="button"
                      onClick={reloadSend}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                      <IoReload size={14} />
                      Gửi lại
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {isAnalyzing && (
            <div className="flex items-end gap-2" aria-label="Aloca đang trả lời">
              <BotAvatar />
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-soft ring-1 ring-slate-100">
                <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          {noUserMessage && !isAnalyzing && (
            <div className="mt-2 flex flex-wrap gap-2 pl-10">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendPrompt(s)}
                  className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-700 transition hover:border-brand-400 hover:bg-brand-50">
                  <IoSparkles size={14} />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="px-4 pt-1 pb-3 md:px-6 md:pb-5">
        <div className="flex items-end gap-2 rounded-3xl bg-white p-1.5 pl-4 shadow-soft ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-400">
          <textarea
            placeholder="Hỏi Aloca bất cứ điều gì về du lịch..."
            rows={1}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Tin nhắn"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none [field-sizing:content] placeholder:text-slate-400"
          />
          <button
            type="submit"
            aria-label="Gửi"
            disabled={isAnalyzing || textInput.trim() === ''}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400">
            <FiSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
