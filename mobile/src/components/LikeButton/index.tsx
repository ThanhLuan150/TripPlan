import {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {tripsApi} from '../../api';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {errorText} from '../../lib/apiClient';
import {colors, radius} from '../../lib/theme';

interface Props {
  // the post (public trip) being liked
  tripId: string;
  liked?: boolean;
  likesCount?: number;
}

// Like / Unlike of a post with the total. What is shown is the state the server answered
// (the count is never worked out here), and the button is off while a request runs, so a
// double tap can never send two requests.
export default function LikeButton({
  tripId,
  liked = false,
  likesCount = 0,
}: Props) {
  const {t} = useTranslation();
  const [state, setState] = useState({liked, likesCount});
  // new data from the server (another page, a refetch)
  useEffect(() => setState({liked, likesCount}), [liked, likesCount]);

  const toggle = useApiMutation(
    (like: boolean) =>
      like ? tripsApi.likePublic(tripId) : tripsApi.unlikePublic(tripId),
    {
      onSuccess: result =>
        setState({liked: result.liked, likesCount: result.likesCount}),
      onError: e => alert.error(t('trips.likeFailed'), errorText(e)),
    },
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t(state.liked ? 'trips.unlike' : 'trips.like')}
      accessibilityState={{selected: state.liked, disabled: toggle.isPending}}
      disabled={toggle.isPending}
      style={[
        styles.button,
        state.liked && styles.liked,
        toggle.isPending && styles.disabled,
      ]}
      onPress={() => toggle.mutate(!state.liked)}>
      <Ionicons
        name={state.liked ? 'heart' : 'heart-outline'}
        size={18}
        color={state.liked ? colors.error : colors.muted}
      />
      <Text
        style={[styles.count, state.liked && styles.countLiked]}
        testID="likes-count">
        {state.likesCount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  liked: {backgroundColor: colors.tint},
  disabled: {opacity: 0.6},
  count: {fontSize: 14, fontWeight: '600', color: colors.muted},
  countLiked: {color: colors.error},
});
