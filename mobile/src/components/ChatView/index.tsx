import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Message, useChat} from '../../hooks/useChat';
import {extractTripHints} from '../../lib/tripHints';
import {colors} from '../../lib/theme';
import ChatBubble from '../ChatBubble';
import ChatComposer from '../ChatComposer';
import ChatHistoryDrawer from '../ChatHistoryDrawer';
import ChatToolbar from '../ChatToolbar';
import SuggestionChips from '../SuggestionChips';
import TypingDots from '../TypingDots';

// The "Chat" tab, same features as the web: toolbar (history / new chat), messages, quick questions,
// "plan from this suggestion" under AI answers, typing dots and the input box.
export default function ChatView() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const chat = useChat();
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const list = useRef<FlatList<Message>>(null);

  const {messages} = chat;
  const noUserMessage = !messages.some(m => m.type === 'user');
  const title = messages.find(m => m.type === 'user')?.text;

  const send = (text: string) => {
    chat.sendPrompt(text);
    setInput('');
  };

  // opens the plan form filled from this AI answer (and the question before it): place, days, people and the answer as a note
  const planFromSuggestion = (index: number) => {
    const answer = messages[index]?.text ?? '';
    const question = messages[index - 1]?.type === 'user' ? messages[index - 1].text : undefined;
    navigation.navigate('CreateTrip', {...extractTripHints(answer, question), note: answer.slice(0, 1500)});
  };

  const last = messages.length - 1;
  return (
    // Android resizes the window by itself (adjustResize); only iOS needs the padding
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ChatToolbar title={title} canStartNew={!noUserMessage && !chat.sending} onHistory={() => setHistoryOpen(true)} onNew={chat.startNew} />
      <ChatHistoryDrawer
        open={historyOpen}
        currentId={chat.idChat}
        onClose={() => setHistoryOpen(false)}
        onSelect={id => {
          setHistoryOpen(false);
          chat.openConversation(id);
        }}
        onNewChat={() => {
          setHistoryOpen(false);
          chat.startNew();
        }}
        onDeleted={id => id === chat.idChat && chat.startNew()}
      />
      {chat.loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={list}
          style={styles.messages}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => list.current?.scrollToEnd()}
          renderItem={({item, index}) => (
            <ChatBubble
              mine={item.type === 'user'}
              text={item.i18nKey ? t(item.i18nKey) : item.text ?? ''}
              onResend={item.error && index === last && !chat.sending ? chat.resend : undefined}
              // only real AI answers (not the greetings or errors) can start a plan
              onPlan={item.type === 'bot' && !item.error && !item.i18nKey && item.text ? () => planFromSuggestion(index) : undefined}
            />
          )}
          ListFooterComponent={
            <View>
              {chat.sending && <TypingDots />}
              {noUserMessage && !chat.sending && <SuggestionChips onPick={send} />}
            </View>
          }
        />
      )}
      <ChatComposer value={input} sending={chat.sending || chat.loading} onChangeText={setInput} onSend={() => send(input)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  messages: {flex: 1, paddingHorizontal: 16},
  messagesContent: {flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 12},
});
