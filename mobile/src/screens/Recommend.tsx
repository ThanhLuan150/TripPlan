import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {
  destinationsApi,
  MAX_RECOMMEND_QUERY_LENGTH,
  Recommendation,
  SearchDetail,
} from '../api';
import {BackPill} from '../components';
import AddToTripModal from '../components/AddToTripModal';
import DraftBanner from '../components/DraftBanner';
import SearchHistory from '../components/SearchHistory';
import DropdownInput from '../components/DropdownInput';
import EmptyState from '../components/EmptyState';
import ErrorText from '../components/ErrorText';
import FieldError from '../components/FieldError';
import {useDraft} from '../hooks/useDraft';
import {queryKeys} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {DraftNames} from '../lib/drafts';
import {formatDate} from '../lib/date';
import {areaTypes} from '../lib/areaTypes';
import {
  isYoutubeLink,
  planParams,
  recommendErrorKey,
  recommendErrors,
  RecommendErrors,
} from '../lib/recommend';
import {budgetLabelsFor, budgetValues} from '../lib/budgets';
import {provices} from '../lib/provinces';
import {stripTones} from '../lib/text';
import {colors, radius} from '../lib/theme';

function Card({
  item,
  onUsed,
}: {
  item: Recommendation;
  onUsed: (tripId?: string) => void;
}) {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const place = item.place;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text style={styles.name}>{item.name}</Text>
          {!!item.province && <Text style={styles.meta}>{item.province}</Text>}
        </View>
        <Text style={[styles.badge, item.inApp ? styles.inApp : styles.aiOnly]}>
          {item.inApp ? t('recommend.inApp') : t('recommend.aiOnly')}
        </Text>
      </View>
      <Text style={styles.body}>{item.description}</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>{t('recommend.why')}: </Text>
        {item.reason}
      </Text>
      {!item.inApp && (
        <Text style={styles.warn}>{t('recommend.aiOnlyHint')}</Text>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('recommend.planTripFor', {name: item.name})}
          style={styles.button}
          onPress={() => {
            onUsed();
            navigation.navigate('CreateTrip', planParams(item));
          }}>
          <Text style={styles.buttonText}>{t('recommend.planTrip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('recommend.addToTripFor', {name: item.name})}
          style={[styles.button, styles.outlineButton]}
          onPress={() => setAdding(true)}>
          <Text style={styles.outlineText}>{t('recommend.addToTrip')}</Text>
        </TouchableOpacity>
      </View>
      <AddToTripModal
        item={item}
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={onUsed}
      />
      {item.inApp && place && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{expanded: open}}
            style={styles.outline}
            onPress={() => setOpen(value => !value)}>
            <Text style={styles.outlineText}>
              {open ? t('recommend.hideDetails') : t('recommend.viewDetails')}
            </Text>
          </TouchableOpacity>
          {open && (
            <View style={styles.details}>
              {!!place.imageUrl && (
                <Image
                  source={{uri: place.imageUrl}}
                  accessibilityLabel={place.title}
                  style={styles.image}
                />
              )}
              <Text style={styles.body}>
                {place.title}
                {!!place.location && ` · ${place.location}`}
              </Text>
              {place.videos.filter(v => isYoutubeLink(v.youtubeLink)).length >
                0 && (
                <Text style={styles.bold}>{t('recommend.videos')}</Text>
              )}
              {place.videos
                .filter(v => isYoutubeLink(v.youtubeLink))
                .map(video => (
                  <TouchableOpacity
                    key={video.id}
                    accessibilityRole="link"
                    onPress={() => Linking.openURL(video.youtubeLink)}>
                    <Text style={styles.link}>{video.title}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Describe what you look for (plus interests, region, budget) and the AI suggests places.
// Nothing is saved; places the app has no data for are labelled as AI-only suggestions.
export default function Recommend() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [budgetIndex, setBudgetIndex] = useState(-1);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const budgetLabels = budgetLabelsFor(t);
  const budgetLabel = budgetIndex < 0 ? '' : budgetLabels[budgetIndex];
  // the text sent to the AI is always Vietnamese
  const budget = budgetIndex < 0 ? '' : budgetValues[budgetIndex];
  // shown once the user tried to send, then kept up to date while they type; a too long request is flagged at once
  const [submitted, setSubmitted] = useState(false);
  const found = recommendErrors({query, interests, region, budget});
  const errors: RecommendErrors = submitted
    ? found
    : found.query === 'recommend.tooLong'
      ? {query: found.query}
      : {};
  // what is on screen: the answer, its copy in the history, and the earlier suggestion being read again
  const [result, setResult] = useState<{
    recommendations: Recommendation[];
    historyId: string | null;
  } | null>(null);
  const [reading, setReading] = useState<SearchDetail | null>(null);
  const [failure, setFailure] = useState('');
  const qc = useQueryClient();

  // the form as a draft: not saved right after a search (the history has it) and not when empty
  const formValue = {query, interests, region, budgetIndex};
  const [sent, setSent] = useState('');
  const unchanged = JSON.stringify(formValue) === sent;
  const draft = useDraft(
    DraftNames.recommend,
    formValue,
    (!query.trim() && interests.length === 0 && !region && budgetIndex < 0) ||
      unchanged,
  );

  const recommend = useApiMutation(destinationsApi.recommend, {
    onSuccess: data => {
      setFailure('');
      setResult({recommendations: data.recommendations, historyId: data.historyId});
      setReading(null);
      setSent(JSON.stringify(formValue));
      draft.clear();
      qc.invalidateQueries({queryKey: queryKeys.destinationHistory});
    },
    onError: error => setFailure(recommendErrorKey(error)),
  });

  // a plan was started from a suggestion: its history entry moves to "Created"
  const markUsed = (tripId?: string) => {
    const id = result?.historyId;
    if (id) {
      Promise.resolve(destinationsApi.setStatus(id, 'created', tripId))
        .catch(() => undefined)
        .finally(() =>
          qc.invalidateQueries({queryKey: queryKeys.destinationHistory}),
        );
    }
  };

  // read an earlier suggestion again: its request goes back into the form, so it can be changed and asked again
  const openHistory = (search: SearchDetail) => {
    const index = budgetValues.indexOf(search.budget);
    setQuery(search.query);
    setInterests(search.interests);
    setRegion(search.region);
    setBudgetIndex(index);
    setSubmitted(false);
    setFailure('');
    setResult({recommendations: search.recommendations, historyId: search.id});
    setReading(search);
    setSent(
      JSON.stringify({
        query: search.query,
        interests: search.interests,
        region: search.region,
        budgetIndex: index,
      }),
    );
  };

  const regions = useMemo(() => {
    const q = stripTones(region);
    return provices.filter(p => stripTones(p).includes(q));
  }, [region]);

  const submit = () => {
    const params = {query, interests, region, budget};
    setSubmitted(true);
    if (Object.keys(found).length === 0 && !recommend.isPending) {
      setResult(null);
      setReading(null);
      setFailure('');
      recommend.mutate(params);
    }
  };
  const toggle = (value: string) =>
    setInterests(list =>
      list.includes(value) ? list.filter(a => a !== value) : [...list, value],
    );

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('recommend.title')}</Text>
        <Text style={styles.meta}>{t('recommend.subtitle')}</Text>
        <Text style={styles.meta}>
          {t('recommend.toChatHint')}{' '}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => navigation.navigate('Tabs', {screen: 'Assistant'})}>
            {t('recommend.toChat')}
          </Text>
        </Text>

        {draft.pending && (
          <DraftBanner
            savedAt={draft.pending.savedAt}
            onContinue={() => {
              const saved = draft.resume();
              if (saved) {
                setQuery(saved.query);
                setInterests(saved.interests);
                setRegion(saved.region);
                setBudgetIndex(saved.budgetIndex);
              }
            }}
            onDiscard={draft.discard}
          />
        )}

        <Text style={styles.label}>{t('recommend.query')}</Text>
        <TextInput
          multiline
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('recommend.query')}
          placeholder={t('recommend.queryPlaceholder')}
          placeholderTextColor={colors.faint}
          style={[styles.input, styles.multiline, !!errors.query && styles.invalid]}
        />
        <FieldError
          message={
            errors.query ? t(errors.query, {max: MAX_RECOMMEND_QUERY_LENGTH}) : false
          }
        />

        <Text style={styles.counter}>
          {query.length}/{MAX_RECOMMEND_QUERY_LENGTH}
        </Text>

        <Text style={styles.label}>{t('recommend.interests')}</Text>
        <View style={styles.chips}>
          {areaTypes.map(({value, labelKey}) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{selected: interests.includes(value)}}
              style={[
                styles.chip,
                !!errors.interests && styles.chipInvalid,
                interests.includes(value) && styles.chipOn,
              ]}
              onPress={() => toggle(value)}>
              <Text
                style={[
                  styles.chipText,
                  interests.includes(value) && styles.chipTextOn,
                ]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FieldError message={errors.interests ? t(errors.interests) : false} />

        <Text style={styles.label}>{t('recommend.region')}</Text>
        <DropdownInput
          icon="location-outline"
          value={region}
          placeholder={t('recommend.regionPlaceholder')}
          open={regionOpen}
          invalid={!!errors.region}
          options={regionOpen ? regions.slice(0, 6) : []}
          onChangeText={text => {
            setRegion(text);
            setRegionOpen(true);
          }}
          onToggle={() => setRegionOpen(o => !o)}
          onPick={p => {
            setRegion(p);
            setRegionOpen(false);
          }}
        />
        <FieldError message={errors.region ? t(errors.region) : false} />

        <Text style={styles.label}>{t('recommend.budget')}</Text>
        <DropdownInput
          icon="cash-outline"
          value={budgetLabel}
          placeholder={t('trips.budgetPlaceholder')}
          editable={false}
          open={budgetOpen}
          invalid={!!errors.budget}
          options={budgetOpen ? [t('recommend.anyBudget'), ...budgetLabels] : []}
          onToggle={() => setBudgetOpen(o => !o)}
          onPick={label => {
            // the first option clears the budget: it is optional
            setBudgetIndex(budgetLabels.indexOf(label));
            setBudgetOpen(false);
          }}
        />
        <FieldError
          message={
            errors.budget ? t(errors.budget) : false
          }
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('recommend.ask')}
          disabled={recommend.isPending}
          style={[styles.button, recommend.isPending && styles.disabled]}
          onPress={submit}>
          <Text style={styles.buttonText}>{t('recommend.ask')}</Text>
        </TouchableOpacity>

        {recommend.isPending && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.meta}>{t('recommend.loading')}</Text>
          </View>
        )}
        {!!failure && <ErrorText message={t(failure)} />}

        {result && result.recommendations.length === 0 && (
          <EmptyState icon="compass-outline" text={t('recommend.empty')} />
        )}
        {result && result.recommendations.length > 0 && (
          <View style={styles.results}>
            {reading && (
              <Text style={styles.reading}>
                {t('recommend.historyOpened', {
                  date: formatDate(reading.createdAt, i18n.language),
                })}
              </Text>
            )}
            <Text style={styles.meta}>{t('recommend.disclaimer')}</Text>
            {result.recommendations.map(item => (
              <Card key={item.name} item={item} onUsed={markUsed} />
            ))}
          </View>
        )}

        <SearchHistory onOpen={openHistory} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg, paddingTop: 36},
  content: {paddingHorizontal: 15, paddingBottom: 40, gap: 6},
  flex: {flex: 1},
  title: {fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8},
  label: {fontWeight: '600', color: colors.text, marginTop: 10},
  meta: {fontSize: 12, color: colors.muted},
  counter: {fontSize: 12, color: colors.faint, textAlign: 'right'},
  reading: {
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    color: colors.primaryDeep,
    fontSize: 13,
  },
  input: {
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  multiline: {minHeight: 56, textAlignVertical: 'top'},
  invalid: {borderColor: colors.error},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipInvalid: {borderColor: colors.error},
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {color: colors.body},
  chipTextOn: {color: '#fff', fontWeight: '600'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  outlineButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary},
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  disabled: {opacity: 0.6},
  loading: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14},
  results: {gap: 10, marginTop: 14},
  card: {
    padding: 14,
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardHead: {flexDirection: 'row', gap: 8},
  name: {fontSize: 16, fontWeight: '700', color: colors.text},
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    fontSize: 11,
    fontWeight: '700',
  },
  inApp: {backgroundColor: '#DCFCE7', color: '#15803D'},
  aiOnly: {backgroundColor: '#FEF3C7', color: '#B45309'},
  body: {color: colors.body},
  bold: {fontWeight: '700', color: colors.text},
  warn: {fontSize: 12, color: '#B45309'},
  outline: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineText: {color: colors.primaryDark, fontWeight: '600'},
  details: {gap: 6, padding: 10, borderRadius: radius.sm, backgroundColor: colors.surface},
  image: {height: 160, borderRadius: radius.sm},
  link: {color: colors.primaryDark, textDecorationLine: 'underline'},
});
