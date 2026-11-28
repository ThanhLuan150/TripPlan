import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {MAX_REVIEW_LENGTH, Review, reviewsApi} from '../api';
import {BackPill, ConfirmModal, ErrorText} from '../components';
import EmptyState from '../components/EmptyState';
import FieldError from '../components/FieldError';
import {StarDisplay, StarInput} from '../components/StarRating';
import {queryKeys, useDestinationReviews} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {apiStatus, errorText} from '../lib/apiClient';
import {formatDate} from '../lib/date';
import {colors, radius, shadow} from '../lib/theme';

// Reviews of a destination: the average rating, the reviews of travelers and the user's own review
// (write it once, then edit or delete it). A destination that does not exist gives a "not found".
export default function DestinationReviews() {
  const {t, i18n} = useTranslation();
  const {destination} = useRoute<any>().params as {destination: string};
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const query = useDestinationReviews(destination);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const myReview = first?.myReview ?? null;
  const others = pages
    .flatMap(page => page.items)
    .filter(item => item._id !== myReview?._id);

  const refresh = () =>
    qc.invalidateQueries({queryKey: queryKeys.destinationReviews(destination)});

  // 409: already reviewed (one review per destination), 403: not the author, 404: it vanished
  const failureText = (e: unknown, fallback: string) => {
    const status = apiStatus(e);
    return status === 409
      ? t('reviews.duplicate')
      : status === 403
        ? t('reviews.notAllowed')
        : status === 404
          ? t('reviews.reviewGone')
          : status
            ? t(fallback)
            : errorText(e);
  };

  const save = useApiMutation(
    ({rating, content}: {rating: number; content: string}) =>
      editing && myReview
        ? reviewsApi.update(myReview._id, rating, content)
        : reviewsApi.create(destination, rating, content),
    {
      onSuccess: () => {
        alert.success(
          t('common.success'),
          t(editing ? 'reviews.updated' : 'reviews.created'),
        );
        setEditing(false);
        setFormError(null);
        refresh();
      },
      onError: e => {
        setFormError(failureText(e, 'reviews.failed'));
        // somebody else's / vanished review: show what is really there
        if (apiStatus(e) === 409 || apiStatus(e) === 404) {
          setEditing(false);
          refresh();
        }
      },
    },
  );

  const remove = useApiMutation((id: string) => reviewsApi.remove(id), {
    onSuccess: () => {
      alert.success(t('common.success'), t('reviews.deleted'));
      setEditing(false);
      refresh();
    },
    onError: e => {
      alert.error(t('reviews.deleteFailed'), failureText(e, 'reviews.deleteFailed'));
      refresh();
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.container}>
        <BackPill onPress={() => navigation.goBack()} />
        <ActivityIndicator size={30} color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (query.isError || !first) {
    return (
      <View style={styles.container}>
        <BackPill onPress={() => navigation.goBack()} />
        <ErrorText
          message={
            apiStatus(query.error) === 404
              ? t('reviews.notFound')
              : t('reviews.loadFailed')
          }
        />
      </View>
    );
  }

  const {summary} = first;

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>
        {t('reviews.title', {place: first.destination})}
      </Text>
      <Text style={styles.subtitle}>{t('reviews.subtitle')}</Text>
      <View style={styles.summary}>
        {summary.average === null ? (
          <Text style={styles.noAverage}>{t('reviews.noAverage')}</Text>
        ) : (
          <>
            <Text
              accessibilityLabel={t('reviews.average')}
              style={styles.average}>
              {summary.average}
              <Text style={styles.outOf}> / 5</Text>
            </Text>
            <StarDisplay value={summary.average} size={20} />
          </>
        )}
        <Text style={styles.count}>{t('reviews.count', {count: summary.count})}</Text>
      </View>

      {myReview && !editing && (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t('reviews.yourReview')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('reviews.edit')}
                style={styles.small}
                onPress={() => {
                  setFormError(null);
                  setEditing(true);
                }}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.smallText}>{t('reviews.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('reviews.delete')}
                disabled={remove.isPending}
                style={[styles.small, styles.smallDanger]}
                onPress={() => setDeleting(true)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.smallText, styles.dangerText]}>
                  {t('reviews.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <ReviewBody review={myReview} language={i18n.language} />
        </View>
      )}

      {(!myReview || editing) && (
        <ReviewForm
          key={editing ? myReview?._id : 'new'}
          initial={
            editing && myReview
              ? {rating: myReview.rating, content: myReview.content}
              : undefined
          }
          submitting={save.isPending}
          error={formError}
          onSubmit={(rating, content) => {
            setFormError(null);
            save.mutate({rating, content});
          }}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <FlatList
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        data={others}
        keyExtractor={item => item._id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          myReview ? null : (
            <EmptyState icon="chatbubbles-outline" text={t('reviews.empty')} />
          )
        }
        renderItem={({item}) => (
          <View style={styles.card}>
            <ReviewBody review={item} language={i18n.language} showAuthor />
          </View>
        )}
        ListFooterComponent={
          query.hasNextPage ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.more}
              disabled={query.isFetchingNextPage}
              onPress={() => query.fetchNextPage()}>
              <Text style={styles.moreText}>{t('reviews.more')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <ConfirmModal
        visible={deleting}
        title={t('reviews.deleteTitle')}
        confirmText={t('reviews.delete')}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          if (myReview) {
            remove.mutate(myReview._id);
          }
        }}>
        <Text style={styles.deleteText}>{t('reviews.deleteText')}</Text>
      </ConfirmModal>
    </View>
  );
}

function ReviewBody({
  review,
  language,
  showAuthor = false,
}: {
  review: Review;
  language: string;
  showAuthor?: boolean;
}) {
  const {t} = useTranslation();
  const edited =
    new Date(review.updatedAt).getTime() -
      new Date(review.createdAt).getTime() >
    1000;
  return (
    <View style={styles.body}>
      <View style={styles.meta}>
        <StarDisplay value={review.rating} size={14} />
        {showAuthor && !!review.author.username && (
          <Text style={styles.author}>{review.author.username}</Text>
        )}
        <Text style={styles.date}>
          {formatDate(review.createdAt, language)}
          {edited ? ` · ${t('reviews.edited')}` : ''}
        </Text>
      </View>
      <Text style={styles.content}>{review.content}</Text>
    </View>
  );
}

// Rating (1-5 stars) and comment. The same rules as the server run here first, so a mistake is
// shown at once; the server checks again.
function ReviewForm({
  initial,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: {rating: number; content: string};
  submitting: boolean;
  error: string | null;
  onSubmit: (rating: number, content: string) => void;
  onCancel?: () => void;
}) {
  const {t} = useTranslation();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [content, setContent] = useState(initial?.content ?? '');
  const [submitted, setSubmitted] = useState(false);
  const editing = !!initial;

  const length = content.trim().length;
  const ratingError = rating < 1 ? t('reviews.errRating') : false;
  const contentError =
    length === 0
      ? t('reviews.errContent')
      : length > MAX_REVIEW_LENGTH
        ? t('reviews.errContentLong', {max: MAX_REVIEW_LENGTH})
        : false;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {t(editing ? 'reviews.editTitle' : 'reviews.formTitle')}
      </Text>
      <Text style={styles.label}>{t('reviews.ratingLabel')}</Text>
      <StarInput
        value={rating}
        onChange={setRating}
        invalid={submitted && !!ratingError}
      />
      <FieldError message={submitted && ratingError} />

      <Text style={styles.label}>{t('reviews.commentLabel')}</Text>
      <TextInput
        multiline
        accessibilityLabel={t('reviews.commentLabel')}
        placeholder={t('reviews.commentPlaceholder')}
        placeholderTextColor={colors.faint}
        value={content}
        onChangeText={setContent}
        style={[styles.input, submitted && !!contentError && styles.invalid]}
      />
      <View style={styles.counterRow}>
        <View style={styles.flex}>
          <FieldError message={submitted && contentError} />
        </View>
        <Text style={styles.counter}>
          {t('reviews.counter', {count: length, max: MAX_REVIEW_LENGTH})}
        </Text>
      </View>
      <FieldError message={error ?? false} />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t(editing ? 'reviews.update' : 'reviews.submit')}
        disabled={submitting}
        style={[styles.primary, submitting && styles.disabled]}
        onPress={() => {
          setSubmitted(true);
          if (!ratingError && !contentError) {
            onSubmit(rating, content.trim());
          }
        }}>
        <Text style={styles.primaryText}>
          {t(editing ? 'reviews.update' : 'reviews.submit')}
        </Text>
      </TouchableOpacity>
      {onCancel && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('reviews.cancel')}
          style={styles.secondary}
          onPress={onCancel}>
          <Text style={styles.secondaryText}>{t('reviews.cancel')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg, paddingTop: 36},
  loading: {marginTop: 60},
  list: {paddingHorizontal: 15, paddingTop: 24, paddingBottom: 60, gap: 12},
  header: {gap: 12},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {fontSize: 13, color: colors.muted, textAlign: 'center'},
  summary: {alignItems: 'center', gap: 6},
  average: {fontSize: 38, fontWeight: '800', color: colors.text},
  outOf: {fontSize: 16, fontWeight: '500', color: colors.muted},
  noAverage: {color: colors.muted},
  count: {color: colors.body, fontSize: 13},
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {fontWeight: '700', color: colors.text, fontSize: 15},
  actions: {flexDirection: 'row', gap: 8},
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  smallDanger: {borderColor: colors.error},
  smallText: {color: colors.primary, fontWeight: '600', fontSize: 12},
  dangerText: {color: colors.error},
  body: {gap: 6},
  meta: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  author: {color: colors.text, fontWeight: '700', fontSize: 13},
  date: {color: colors.faint, fontSize: 12},
  content: {color: colors.body, fontSize: 14},
  label: {color: colors.label, fontWeight: '600', fontSize: 13},
  input: {
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  invalid: {borderColor: colors.error},
  counterRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  flex: {flex: 1},
  counter: {color: colors.faint, fontSize: 12, marginTop: 6},
  primary: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {color: '#fff', fontWeight: '700'},
  secondary: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {color: colors.primary, fontWeight: '700'},
  disabled: {opacity: 0.6},
  more: {alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20},
  moreText: {color: colors.primary, fontWeight: '700'},
  deleteText: {color: colors.body, fontSize: 13, textAlign: 'center'},
});
