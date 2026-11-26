import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {
  destinationsApi,
  SearchDetail,
  SearchStatus,
  SearchSummary,
} from '../../api';
import {queryKeys} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {formatDate} from '../../lib/date';
import {colors, radius} from '../../lib/theme';
import ConfirmModal from '../ConfirmModal';

// what the user asked, in a few words (the request, else the choices they made)
const titleOf = (search: SearchSummary, fallback: string) =>
  search.query ||
  [...search.interests, search.region].filter(Boolean).join(', ') ||
  fallback;

function Group({
  status,
  items,
  openingId,
  onOpen,
  onDelete,
}: {
  status: SearchStatus;
  items: SearchSummary[];
  openingId: string | null;
  onOpen: (search: SearchSummary) => void;
  onDelete: (search: SearchSummary) => void;
}) {
  const {t, i18n} = useTranslation();
  return (
    <View style={styles.gap}>
      <Text style={styles.groupTitle}>
        {t(status === 'draft' ? 'recommend.historyDrafts' : 'recommend.historyCreated')}{' '}
        <Text style={styles.meta}>({items.length})</Text>
      </Text>
      <Text style={styles.meta}>
        {t(status === 'draft' ? 'recommend.historyDraftsHint' : 'recommend.historyCreatedHint')}
      </Text>
      {items.length === 0 ? (
        <Text style={styles.none}>—</Text>
      ) : (
        items.map(search => {
          const title = titleOf(search, t('recommend.historyUntitled'));
          return (
            <View key={search.id} style={styles.item}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {`${formatDate(search.createdAt, i18n.language)} · ${t(
                    'recommend.historyCount',
                    {count: search.count},
                  )}${search.names.length > 0 ? ` · ${search.names.join(', ')}` : ''}`}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${t('recommend.historyOpen')}: ${title}`}
                disabled={openingId === search.id}
                style={styles.open}
                onPress={() => onOpen(search)}>
                <Text style={styles.openText}>{t('recommend.historyOpen')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${t('recommend.historyDelete')}: ${title}`}
                style={styles.remove}
                onPress={() => onDelete(search)}>
                <Text style={styles.removeText}>{t('recommend.historyDelete')}</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

// The earlier AI suggestions of the user in two groups (drafts: not used yet, created: a plan was
// started from them). Open one to read it again and change the request, or delete it.
export default function SearchHistory({
  onOpen,
}: {
  onOpen: (search: SearchDetail) => void;
}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const history = useQuery({
    queryKey: queryKeys.destinationHistory,
    queryFn: destinationsApi.history,
  });
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SearchSummary | null>(null);

  const open = async (search: SearchSummary) => {
    setOpeningId(search.id);
    try {
      onOpen(await destinationsApi.open(search.id));
    } catch {
      alert.error(t('recommend.historyOpenFailed'));
    } finally {
      setOpeningId(null);
    }
  };
  const remove = useApiMutation((id: string) => destinationsApi.remove(id), {
    onSuccess: () => {
      setDeleting(null);
      qc.invalidateQueries({queryKey: queryKeys.destinationHistory});
      alert.success(t('recommend.historyDeleted'));
    },
    onError: () => {
      setDeleting(null);
      alert.error(t('recommend.historyDeleteFailed'));
    },
  });

  const items = history.data ?? [];
  return (
    <View style={[styles.card, styles.gap]}>
      <Text style={styles.title}>{t('recommend.historyTitle')}</Text>
      <Text style={styles.meta}>{t('recommend.historyIntro')}</Text>

      {history.isLoading && <ActivityIndicator color={colors.primary} />}
      {history.isError && (
        <View style={styles.gap}>
          <Text style={styles.body}>{t('recommend.historyLoadFailed')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.open}
            onPress={() => history.refetch()}>
            <Text style={styles.openText}>{t('recommend.addRetry')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {history.data && items.length === 0 && (
        <Text style={styles.body}>{t('recommend.historyEmpty')}</Text>
      )}
      {items.length > 0 && (
        <>
          <Group
            status="draft"
            items={items.filter(item => item.status === 'draft')}
            openingId={openingId}
            onOpen={open}
            onDelete={setDeleting}
          />
          <Group
            status="created"
            items={items.filter(item => item.status === 'created')}
            openingId={openingId}
            onOpen={open}
            onDelete={setDeleting}
          />
        </>
      )}

      <ConfirmModal
        visible={!!deleting}
        title={t('recommend.historyDeleteTitle')}
        confirmText={t('recommend.historyDelete')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}>
        <Text style={styles.body}>{t('recommend.historyDeleteText')}</Text>
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  gap: {gap: 8},
  flex: {flex: 1},
  title: {fontSize: 16, fontWeight: '700', color: colors.text},
  groupTitle: {fontWeight: '700', color: colors.text, marginTop: 6},
  meta: {fontSize: 12, color: colors.muted},
  body: {color: colors.body, fontSize: 13},
  none: {color: colors.faint, textAlign: 'center'},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTitle: {color: colors.text, fontWeight: '600'},
  open: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  openText: {color: colors.primaryDark, fontWeight: '600'},
  remove: {paddingVertical: 6, paddingHorizontal: 8},
  removeText: {color: colors.error, fontWeight: '600'},
});
