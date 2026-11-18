import {useTranslation} from 'react-i18next';
import {ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useQueryClient} from '@tanstack/react-query';
import {ChatSummary, chatApi} from '../../api';
import {queryKeys, useChats} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {formatDate} from '../../lib/date';
import {colors, radius} from '../../lib/theme';
import EmptyState from '../EmptyState';

interface Props {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
}

// Side panel with the saved conversations: open one, delete one, or start a new chat (same as the web drawer).
export default function ChatHistoryDrawer({open, currentId, onClose, onSelect, onNewChat, onDeleted}: Props) {
  const {t, i18n} = useTranslation();
  const qc = useQueryClient();
  const chats = useChats(open);

  const remove = useApiMutation(chatApi.remove, {
    onSuccess: (_res, id) => {
      void qc.invalidateQueries({queryKey: queryKeys.chats});
      onDeleted(id);
    },
    onError: () => alert.error(t('common.failed'), t('assistant.deleteFailed')),
  });

  const askDelete = (chat: ChatSummary) =>
    alert.confirm({
      title: t('assistant.deleteChatTitle'),
      message: t('assistant.deleteChatText', {title: chat.title || t('assistant.untitled')}),
      confirmText: t('common.delete'),
      destructive: true,
      onConfirm: () => remove.mutate(chat._id),
    });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('assistant.historyTitle')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.newButton} onPress={onNewChat}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newText}>{t('assistant.newChat')}</Text>
          </TouchableOpacity>
          {chats.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <FlatList
              data={chats.data ?? []}
              keyExtractor={c => c._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyState icon="chatbubbles-outline" text={t('assistant.noHistory')} />}
              renderItem={({item}) => {
                const active = item._id === currentId;
                return (
                  <View style={[styles.item, active && styles.itemActive]}>
                    <TouchableOpacity style={styles.itemBody} onPress={() => onSelect(item._id)}>
                      <Text numberOfLines={1} style={[styles.itemTitle, active && styles.itemTitleActive]}>
                        {item.title || t('assistant.untitled')}
                      </Text>
                      <Text style={styles.itemDate}>{formatDate(item.updatedAt ?? item.createdAt, i18n.language)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.trash} onPress={() => askDelete(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.faint} />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row', justifyContent: 'flex-end'},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.3)'},
  panel: {width: '86%', maxWidth: 340, backgroundColor: '#fff', paddingTop: 44, borderTopLeftRadius: 24, borderBottomLeftRadius: 24},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {color: colors.text, fontSize: 17, fontWeight: '700'},
  newButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 14, height: 46, borderRadius: radius.md, backgroundColor: colors.primary},
  newText: {color: '#fff', fontWeight: '700'},
  loading: {marginTop: 24},
  list: {paddingHorizontal: 10, paddingBottom: 24},
  item: {flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, marginBottom: 4},
  itemActive: {backgroundColor: colors.tint, borderWidth: 1, borderColor: '#B8EFEA'},
  itemBody: {flex: 1, paddingVertical: 11, paddingLeft: 12},
  itemTitle: {color: colors.text, fontSize: 14, fontWeight: '600'},
  itemTitleActive: {color: colors.primaryDeep},
  itemDate: {color: colors.faint, fontSize: 12, marginTop: 2},
  trash: {padding: 12},
});
